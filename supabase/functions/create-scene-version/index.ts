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
  const scene_id = (body.scene_id || "").trim();
  const provider_job_id = (body.provider_job_id || "").trim() || null;
  const source_url = (body.source_url || "").trim() || null;

  if (!scene_id) {
    return new Response(JSON.stringify({ error: "scene_id required" }), { status: 400, headers: corsHeaders });
  }

  const { data, error } = await supabase
    .from("scene_versions")
    .insert([{
      scene_id,
      status: "pending",
      provider_job_id,
      source_url,
      selected: false,
    }])
    .select()
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: true, version: data }), { status: 201, headers: corsHeaders });
});