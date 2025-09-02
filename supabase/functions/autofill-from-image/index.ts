// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CATEGORY_SCENES = {
  beverage: [
    "kitchen counter hero shot",
    "on-the-go (car cupholder or gym bag)",
    "taste/reaction close-up"
  ],
  skincare: [
    "bathroom mirror selfie",
    "application macro",
    "after-glow/texture"
  ],
};

function randomPalette() {
  return ["#E93E3E", "#111", "#FDF9F1"];
}

function compliance(product, vision) {
  const warnings = [];
  const disclaimers = [];
  const text = (vision.text || []).join(" ").toLowerCase();
  if (/spf|fda|dietary supplement|alcohol \d+%/.test(text)) {
    disclaimers.push("Consult packaging for full details. Not medical advice.");
    warnings.push("Detected regulated term; disclaimer added.");
  }
  return { warnings, disclaimers };
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json();
    if (!body.imageUrl || typeof body.imageUrl !== "string" || !body.imageUrl.startsWith("http")) {
      return new Response(JSON.stringify({ error: "imageUrl required and must be a valid URL" }), { status: 400 });
    }

    // 1) Analyze image (mocked for MVP)
    const vision = {
      text: ["BrandX", "Zero Sugar", "SPF 30"],
      labels: ["beverage", "can", "kitchen"],
      colors: randomPalette(),
      envHints: ["kitchen", "daylight"]
    };

    // 2) Infer product/category
    const product = {
      brand: "BrandX",
      name: "Zero Sugar",
      variant: "SPF 30",
      category: "beverage",
      claims: ["SPF 30"]
    };
    const palette = vision.colors;
    const env = vision.envHints[0] || "kitchen";

    // 3) Build creative_brief
    const creative_brief = {
      product,
      palette,
      aspect: "9:16",
      numScenes: 3,
      influencer: { appearance: "everyday casual", ageRange: "20-35", genders: "mixed" },
      themeHint: body.themeHint || "refreshment",
      scriptMode: body.scriptMode || "ai"
    };

    // 4) Build Veo JSON scenes (one story continuity)
    const sceneTemplates = CATEGORY_SCENES[product.category] || [
      "scene 1: product hero",
      "scene 2: lifestyle use",
      "scene 3: close-up"
    ];
    const scenes = sceneTemplates.map((desc, idx) => ({
      description: `Selfie/handheld UGC clip #${idx + 1} from ONE continuous story. Theme: ${creative_brief.themeHint}. Include product as visual anchor: ${body.imageUrl}. Setting: ${env}.`,
      style: "photorealistic cinematic, authentic social video",
      camera: "handheld portrait framing, eye-level, minimal shake",
      lighting: "natural, soft key; keep consistent across scenes",
      environment: env,
      elements: [
        "product in frame",
        "actor present",
        "props that reinforce the story"
      ],
      motion: "clear primary action with natural pacing; keep continuity of wardrobe/background",
      ending: "hold on product or satisfied reaction beat",
      text: "none",
      keywords: ["9:16", "mobile", "vertical", "ugc", "handheld", "natural light", "no text"]
    }));

    // 5) Compliance check & disclaimers
    const { warnings, disclaimers } = compliance(product, vision);
    if (disclaimers.length) {
      scenes[scenes.length - 1].ending += ` · ${disclaimers.join(" · ")}`;
    }

    // 6) Confidence (mocked for now)
    const confidence = { product: 0.82, environment: 0.74 };

    return new Response(JSON.stringify({
      creative_brief,
      scenes,
      confidence,
      warnings
    }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error: " + (e?.message || e) }), { status: 500 });
  }
});