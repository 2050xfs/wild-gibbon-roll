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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Return all tasks (for personal use)
  const { data, error } = await supabase
    .from("video_tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return new Response(JSON.stringify({ error: "DB error", details: error }), { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ tasks: data }), { status: 200, headers: corsHeaders });
});