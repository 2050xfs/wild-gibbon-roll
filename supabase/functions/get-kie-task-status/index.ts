// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KIE_API_URL = "https://api.kie.ai/api/v1/veo/record-info";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
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
      const res = await fetch(`${KIE_API_URL}?taskId=${encodeURIComponent(taskId)}`, {
        method: "GET",
        // No auth header needed for public endpoint
      });
      kieStatus = await res.json();
    } catch (e) {
      kieStatus = { error: "Failed to fetch from KIE", details: e?.message || e };
    }
    results.push({ taskId, kie: kieStatus });
  }

  return new Response(JSON.stringify({ results }), { status: 200, headers: corsHeaders });
});