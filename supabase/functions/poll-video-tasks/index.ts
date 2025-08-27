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

async function downloadAndStoreVideo(fileUrl, taskId) {
  // Call the fetch-and-store-video edge function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-and-store-video`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_url: fileUrl,
      bucket: "ugc-videos",
      path: `videos/${taskId}.mp4`,
      makePublic: true,
      contentType: "video/mp4",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.publicUrl) throw new Error("Failed to store video in Supabase");
  return data.publicUrl;
}

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
    // Poll KIE AI for status and metadata
    const res = await fetch(`${KIE_BASE}/api/v1/veo/record-info?taskId=${task.task_id}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${KIE_KEY}` },
    });
    const result = await res.json();
    if (!res.ok || result.code !== 200) continue;
    const data = result.data;
    if (!data) continue;

    // KIE AI status: 0 = generating, 1 = success, 2/3 = failed
    if (data.successFlag === 1 && data.resultUrls) {
      let resultUrls;
      try { resultUrls = JSON.parse(data.resultUrls); } catch { resultUrls = []; }
      const kieVideoUrl = resultUrls[0];
      if (!kieVideoUrl) continue;

      // Download and store in Supabase
      let supabaseUrl = null;
      try {
        supabaseUrl = await downloadAndStoreVideo(kieVideoUrl, task.task_id);
      } catch (e) {
        // If download fails, skip update for now
        continue;
      }

      // Update DB with Supabase URL and KIE AI metadata
      await supabase
        .from("video_tasks")
        .update({
          status: "ready",
          video_url: supabaseUrl,
          kie_ai_result_url: kieVideoUrl,
          kie_ai_credits: data.creditsConsumed || null,
          kie_ai_time: data.createTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      updated++;
    } else if (data.successFlag === 2 || data.successFlag === 3) {
      await supabase
        .from("video_tasks")
        .update({
          status: "failed",
          error: result.msg || "Generation failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      updated++;
    }
  }
  return new Response(JSON.stringify({ updated }), { status: 200, headers: corsHeaders });
});