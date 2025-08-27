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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!KIE_BASE || !KIE_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Get all pending tasks
  const { data: tasks, error } = await supabase
    .from("video_tasks")
    .select("*")
    .eq("status", "pending");
  if (error) return new Response(JSON.stringify({ error: "DB error", details: error }), { status: 500, headers: corsHeaders });

  let updated = 0;
  for (const task of tasks) {
    // Poll KIE AI
    const res = await fetch(`${KIE_BASE}/api/v1/veo/task/${task.task_id}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const data = await res.json();
    if (!res.ok || data.code !== 200) continue;
    const status = data.data?.status;
    if (status === "completed" && data.data?.videoUrl) {
      // Optionally: Download and store in Supabase Storage here
      await supabase
        .from("video_tasks")
        .update({
          status: "ready",
          video_url: data.data.videoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      updated++;
    } else if (status === "failed") {
      await supabase
        .from("video_tasks")
        .update({
          status: "failed",
          error: data.msg || "Generation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      updated++;
    }
  }
  return new Response(JSON.stringify({ updated }), { status: 200, headers: corsHeaders });
});