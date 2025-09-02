// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const { scene_id, provider_job_id, source_url } = await req.json();
  if (!scene_id) return new Response(JSON.stringify({ error: "scene_id required" }), { status: 400 });

  const { data, error } = await supabase
    .from("scene_versions")
    .insert([{
      scene_id,
      status: "pending",
      provider_job_id: provider_job_id || null,
      source_url: source_url || null,
      selected: false,
    }])
    .select()
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ version: data }), { status: 201 });
});