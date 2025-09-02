// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function assertInput(b: any) {
  if (!b || typeof b !== "object") throw new Error("body required");
  if (!b.numScenes || b.numScenes < 1 || b.numScenes > 10) throw new Error("numScenes 1..10");
  if (!["9:16","16:9","1:1"].includes(b.aspect)) throw new Error("aspect invalid");
  if (!["manual","ai"].includes(b.scriptMode)) throw new Error("scriptMode invalid");
}

async function sha256Hex(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function buildVeoJSONScenes(args: any): any[] {
  const { numScenes, aspect, themeHint, influencer, scriptMode, scriptText, productImageUrl } = args;

  const BASE_KEYWORDS_BY_ASPECT = {
    "9:16": ["9:16", "mobile", "vertical"],
    "16:9": ["16:9", "cinematic"],
    "1:1":  ["1:1", "square"],
  };

  const talentLine = [
    influencer?.appearance && `Appearance: ${influencer.appearance}`,
    influencer?.ageRange && `Age Range: ${influencer.ageRange}`,
    influencer?.genders && `Genders: ${influencer.genders}`,
    influencer?.specialScenes && `Requested scenes: ${influencer.specialScenes}`
  ].filter(Boolean).join(" · ");

  const baseKeywords = BASE_KEYWORDS_BY_ASPECT[aspect];
  const commonKeywords = [
    ...baseKeywords,
    "ugc", "handheld", "natural light", "no text"
  ];

  return Array.from({ length: Math.max(1, numScenes) }, (_, i) => {
    const n = i + 1;

    const p: Record<string, any> = {
      description:
        `Selfie/handheld UGC clip #${n} from ONE continuous story. ` +
        (themeHint ? `Theme: ${themeHint}. ` : "") +
        (productImageUrl ? `Include product as visual anchor: ${productImageUrl}. ` : ""),
      style: "photorealistic cinematic, authentic social video",
      camera: "handheld portrait framing, eye-level, minimal shake",
      lighting: "natural, soft key; keep consistent across scenes",
      environment: "realistic everyday setting aligned with story",
      elements: [
        "product in frame",
        "actor present",
        "props that reinforce the story"
      ],
      motion: "clear primary action with natural pacing; keep continuity of wardrobe/background",
      ending: "hold on product or satisfied reaction beat",
      text: "none",
      keywords: commonKeywords
    };

    if (scriptMode === "manual" && scriptText?.trim()) {
      p.sequence = [{ SCRIPT: scriptText.trim() }];
    }

    if (talentLine) p.description += ` Talent: ${talentLine}.`;

    return p;
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json();
    assertInput(body);

    // Server guardrails
    body.numScenes = Math.min(Math.max(body.numScenes, 1), 6);
    if (body.scriptMode === "manual" && body.scriptText?.length > 2000) {
      body.scriptText = body.scriptText.slice(0, 2000);
    }

    // Build JSON scenes
    const scenes = buildVeoJSONScenes(body);

    // Version & provenance
    const templateVersion = "veo-json@2025-09-01";
    const fingerprint = await sha256Hex(JSON.stringify({ templateVersion, scenes }));

    return new Response(JSON.stringify({ templateVersion, promptId: fingerprint, scenes }), {
      headers: { "content-type": "application/json" },
      status: 201
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
});