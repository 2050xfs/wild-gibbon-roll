// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type ProxyRequest = {
  path: string; // e.g. "/v1/veo3/videos" (use exact path from https://docs.kie.ai/)
  method?: "GET" | "POST";
  body?: unknown;
};

function sanitizeBase(url?: string | null) {
  if (!url) return "";
  return url.replace(/\/+$/, ""); // trim trailing slashes
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

  let payload: ProxyRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const baseUrl = sanitizeBase(Deno.env.get("KIEAI_BASE_URL"));
  const apiKey = Deno.env.get("KIEAI_API_KEY");

  if (!baseUrl || !apiKey) {
    return new Response(JSON.stringify({ error: "KIE AI is not configured (missing KIEAI_BASE_URL or KIEAI_API_KEY)" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const path = payload.path || "";
  if (!path.startsWith("/") || path.includes("://")) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const method = payload.method ?? "POST";
  const url = `${baseUrl}${path}`;

  const upstream = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(payload.body ?? {}),
  });

  const text = await upstream.text();
  // Try to return JSON if possible
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return new Response(JSON.stringify({ status: upstream.status, data: json }), {
    status: upstream.ok ? 200 : upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});