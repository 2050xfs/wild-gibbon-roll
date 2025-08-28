// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FIXED_USER_ID = "00000000-0000-0000-0000-000000000000";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const { taskId, prompt, model, aspectRatio } = body;
  if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
    return new Response(JSON.stringify({ error: "taskId is required" }), { status: 400, headers: corsHeaders });
  }

  // Check for duplicate taskId
  const { data: existing, error: selectError } = await supabase
    .from("video_tasks")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ error: "Task ID already exists in database." }), { status: 409, headers: corsHeaders });
  }
  if (selectError) {
    return new Response(JSON.stringify({ error: "DB select failed", details: selectError }), { status: 500, headers: corsHeaders });
  }

  const { error } = await supabase
    .from("video_tasks")
    .insert([{
      user_id: FIXED_USER_ID,
      prompt: prompt || "Manual entry",
      model: model || "veo3_fast",
      aspect_ratio: aspectRatio || "9:16",
      image_urls: [],
      task_id: taskId,
      status: "pending",
    }]);
  if (error) {
    return new Response(JSON.stringify({ error: "DB insert failed", details: error }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ taskId }), { status: 200, headers: corsHeaders });
});