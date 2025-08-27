// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts"
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Analysis = {
  brand_name?: string | null;
  color_scheme?: string[]; // hex colors
  font_style?: string | null;
  visual_description?: string | null;
};

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function normalizeMime(ct?: string | null): string | null {
  if (!ct) return null;
  const base = ct.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  return base;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "imageUrl is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 1: Download the image
  const upstream = await fetch(imageUrl);
  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Failed to fetch image", status: upstream.status, details }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const contentType = normalizeMime(upstream.headers.get("content-type"));
  const buf = new Uint8Array(await upstream.arrayBuffer());
  if (!buf.length) {
    return new Response(JSON.stringify({ error: "Downloaded image is empty" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Ensure supported image format; if unknown/unsupported, re-encode to PNG
  let finalBytes: Uint8Array;
  let finalMime: string;

  if (!contentType || !ALLOWED_MIME.has(contentType)) {
    // Attempt to decode and re-encode as PNG
    try {
      const img = await Image.decode(buf);
      finalBytes = await img.encode(); // PNG by default
      finalMime = "image/png";
    } catch (_e) {
      return new Response(
        JSON.stringify({
          error: "Unsupported or unreadable image format. Could not convert to PNG.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } else {
    // Use original bytes and content type
    finalBytes = buf;
    finalMime = contentType === "image/jpg" ? "image/jpeg" : contentType;
  }

  // Step 3: Convert to data URL for OpenAI (avoids remote fetch issues)
  const base64 = encodeBase64(finalBytes);
  const dataUrl = `data:${finalMime};base64,${base64}`;

  const systemPrompt =
    "You are a precise visual brand analyst. Return concise JSON only, no extra text.";

  const userPrompt =
    `Analyze this product image and return strictly a JSON object with:
- brand_name (string or null if unknown)
- color_scheme (array of up to 5 HEX colors, like ["#AABBCC"])
- font_style (string or null; general family / vibe only)
- visual_description (1-2 sentences describing the product and scene)
Do not include any keys other than these four.`;

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" as const },
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return new Response(JSON.stringify({ error: "OpenAI request failed", details: errText }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;

  let parsed: Analysis | null = null;
  try {
    parsed = content ? JSON.parse(content) : null;
  } catch {
    parsed = null;
  }

  return new Response(JSON.stringify({ analysis: parsed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});