// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: corsHeaders });
  }
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  // Example payload: { provider_job_id, status, rendition_url, error }
  const provider_job_id = (body.provider_job_id || "").trim();
  const status = (body.status || "").trim().toLowerCase();
  const rendition_url = (body.rendition_url || "").trim() || null;
  const errorMsg = (body.error || "").trim() || null;

  if (!provider_job_id || !status) {
    return new Response(JSON.stringify({ error: "provider_job_id and status required" }), { status: 400, headers: corsHeaders });
  }

  // Find the scene_version by provider_job_id
  const { data: version, error: findError } = await supabase
    .from("scene_versions")
    .select("id")
    .eq("provider_job_id", provider_job_id)
    .maybeSingle();

  if (findError || !version) {
    return new Response(JSON.stringify({ error: "scene_version not found" }), { status: 404, headers: corsHeaders });
  }

  // Map provider status to our status
  let newStatus: string;
  if (["ready", "done", "success"].includes(status)) newStatus = "ready";
  else if (["error", "failed", "fail"].includes(status)) newStatus = "error";
  else newStatus = status; // fallback for custom statuses

  // Update the scene_version using the edge function
  const updateRes = await fetch(`${supabaseUrl}/functions/v1/update-scene-version-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
    body: JSON.stringify({
      version_id: version.id,
      status: newStatus,
      rendition_url,
      error: errorMsg,
    }),
  });
  const updateData = await updateRes.json();

  if (!updateRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to update scene_version", details: updateData }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});