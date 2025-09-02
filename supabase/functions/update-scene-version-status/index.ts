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
  const version_id = (body.version_id || "").trim();
  const status = (body.status || "").trim();
  const rendition_url = (body.rendition_url || "").trim() || null;
  const errMsg = (body.error || "").trim() || null;

  if (!version_id || !status) {
    return new Response(JSON.stringify({ error: "version_id and status required" }), { status: 400, headers: corsHeaders });
  }

  const update: any = { status };
  if (rendition_url) update.rendition_url = rendition_url;
  if (status === "ready") update.ready_at = new Date().toISOString();
  if (errMsg) update.error = errMsg;

  const { error } = await supabase
    .from("scene_versions")
    .update(update)
    .eq("id", version_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});