// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KIE_BASE = (Deno.env.get("KIEAI_BASE_URL") || "").replace(/\/+$/, "");
const KIE_KEY = Deno.env.get("KIEAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Use a fixed user_id for all tasks (for personal use)
const FIXED_USER_ID = "00000000-0000-0000-0000-000000000000";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!KIE_BASE || !KIE_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const { prompt, model, aspectRatio, imageUrls } = body;

  // Call KIE AI
  const kieRes = await fetch(`${KIE_BASE}/api/v1/veo/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${KIE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model,
      aspectRatio,
      ...(imageUrls ? { imageUrls } : {}),
    }),
  });
  const kieData = await kieRes.json();
  if (!kieRes.ok || kieData.code !== 200 || !kieData.data?.taskId) {
    return new Response(JSON.stringify({ error: "KIE AI error", details: kieData }), { status: 502, headers: corsHeaders });
  }
  const taskId = kieData.data.taskId;

  // Store in DB with fixed user_id
  const { error } = await supabase
    .from("video_tasks")
    .insert([{
      user_id: FIXED_USER_ID,
      prompt,
      model,
      aspect_ratio: aspectRatio,
      image_urls: imageUrls || [],
      task_id: taskId,
      status: "pending",
    }]);
  if (error) {
    return new Response(JSON.stringify({ error: "DB insert failed", details: error }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ taskId }), { status: 200, headers: corsHeaders });
});