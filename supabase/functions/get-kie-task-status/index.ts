// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KIE_BASE = (Deno.env.get("KIEAI_BASE_URL") || "").replace(/\/+$/, "");
const KIE_KEY = Deno.env.get("KIEAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!KIE_BASE || !KIE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: corsHeaders });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const taskIds = Array.isArray(body.taskIds) ? body.taskIds : [body.taskId].filter(Boolean);
  if (!taskIds.length) {
    return new Response(JSON.stringify({ error: "No taskId(s) provided" }), { status: 400, headers: corsHeaders });
  }

  const results = [];
  for (const taskId of taskIds) {
    let kieStatus = null;
    try {
      const res = await fetch(`${KIE_BASE}/api/v1/veo/record-info?taskId=${taskId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${KIE_KEY}` },
      });
      kieStatus = await res.json();
    } catch (e) {
      kieStatus = { error: "Failed to fetch from KIE", details: e?.message || e };
    }
    results.push({ taskId, kie: kieStatus });
  }

  return new Response(JSON.stringify({ results }), { status: 200, headers: corsHeaders });
});