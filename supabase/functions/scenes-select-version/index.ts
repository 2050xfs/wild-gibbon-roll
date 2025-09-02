// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const { versionId } = await req.json();
  if (!versionId) return new Response(JSON.stringify({ error: "versionId required" }), { status: 400 });

  // Get the scene_id for this version
  const { data: version, error: getError } = await supabase
    .from("scene_versions")
    .select("scene_id")
    .eq("id", versionId)
    .maybeSingle();

  if (getError || !version) {
    return new Response(JSON.stringify({ error: "Version not found" }), { status: 404 });
  }

  // Unselect all versions for this scene, then select the given version
  const { error: unselectError } = await supabase
    .from("scene_versions")
    .update({ selected: false })
    .eq("scene_id", version.scene_id);

  const { error: selectError } = await supabase
    .from("scene_versions")
    .update({ selected: true })
    .eq("id", versionId);

  if (unselectError || selectError) {
    return new Response(JSON.stringify({ error: "Failed to update selection" }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});