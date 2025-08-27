// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateVideoBody = {
  prompt: string;
  aspect_ratio: string; // e.g., "9:16", "16:9", "3:4" per KIE docs
  model?: string;       // e.g., "veo3-1" or "veo3-1-fast"
  init_image_url?: string; // optional for image-to-video
  // passthrough for any extra fields supported by KIE
  [key: string]: unknown;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const baseUrl = (Deno.env.get("KIEAI_BASE_URL") || "").replace(/\/+$/, "");
  const apiKey = Deno.env.get("KIEAI_API_KEY");
  if (!baseUrl || !apiKey) {
    return new Response(JSON.stringify({ error: "KIE AI is not configured (missing KIEAI_BASE_URL or KIEAI_API_KEY)" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: CreateVideoBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!body?.prompt || !body?.aspect_ratio) {
    return new Response(JSON.stringify({ error: "Missing required fields: prompt, aspect_ratio" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = {
    model: body.model || "veo3-1",
    prompt: body.prompt,
    aspect_ratio: body.aspect_ratio,
    ...(body.init_image_url ? { init_image_url: body.init_image_url } : {}),
    // allow any extra options per KIE docs
    ...body,
  };

  const upstream = await fetch(`${baseUrl}/v1/veo3/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return new Response(JSON.stringify({ status: upstream.status, data: json }), {
    status: upstream.ok ? 200 : upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});