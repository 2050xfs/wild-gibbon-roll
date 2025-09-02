// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const { version_id, status, rendition_url, error: errMsg } = await req.json();
  if (!version_id || !status) return new Response(JSON.stringify({ error: "version_id and status required" }), { status: 400 });

  const update: any = { status };
  if (rendition_url) update.rendition_url = rendition_url;
  if (status === "ready") update.ready_at = new Date().toISOString();
  if (errMsg) update.error = errMsg;

  const { error } = await supabase
    .from("scene_versions")
    .update(update)
    .eq("id", version_id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});