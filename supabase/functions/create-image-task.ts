// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Accepts two shapes:
// 1) Direct KIE payload (prompt, model, aspect_ratio, init_image_url?)
// 2) { path?: string, payload: {...} } to override endpoint/path if your KIE image endpoint differs
type ImageBody =
  | {
      prompt: string;
      model?: string;
      aspect_ratio?: string;
      init_image_url?: string;
      [key: string]: unknown;
    }
  | {
      path?: string;
      payload: Record<string, unknown>;
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

  let body: ImageBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Build endpoint and payload in a flexible way
  const candidatePath = typeof body === "object" && "path" in body ? (body.path as string | undefined) : undefined;
  const endpoint = `${baseUrl}${candidatePath || "/v1/images"}`;

  const payload =
    typeof body === "object" && "payload" in body
      ? (body as any).payload
      : body;

  if (!payload?.prompt) {
    return new Response(JSON.stringify({ error: "Missing required field: prompt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const upstream = await fetch(endpoint, {
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