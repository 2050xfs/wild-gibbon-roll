// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const payload = await req.json();

  // Upsert into renders table
  const { error } = await supabase
    .from("renders")
    .upsert({
      id: payload.id,
      status: payload.status,
      url: payload.url ?? null,
      poster: payload.poster ?? null,
      thumbnail: payload.thumbnail ?? null,
      error: payload.error ?? null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("DB upsert error:", error.message);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});