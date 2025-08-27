// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  file_url: string;           // Direct URL to the generated video file
  bucket?: string;            // defaults to "ugc-videos"
  path?: string;              // e.g., "videos/{task_id}.mp4"
  makePublic?: boolean;       // defaults to true
  contentType?: string;       // defaults to "video/mp4"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Supabase service credentials are not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const fileUrl = body.file_url?.trim();
  if (!fileUrl) {
    return new Response(JSON.stringify({ error: "file_url is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const bucket = body.bucket || "ugc-videos";
  const makePublic = body.makePublic !== undefined ? !!body.makePublic : true;
  const contentType = body.contentType || "video/mp4";

  const defaultName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
  const path = body.path || defaultName;

  // Ensure bucket exists and is public if requested
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) {
    await supabase.storage.createBucket(bucket, { public: makePublic });
  } else if (makePublic && existing.data.public === false) {
    await supabase.storage.updateBucket(bucket, { public: true });
  }

  // Download the file
  const res = await fetch(fileUrl);
  if (!res.ok) {
    const t = await res.text();
    return new Response(JSON.stringify({ error: "Failed to download file", details: t }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const buffer = await res.arrayBuffer();

  // Upload to storage
  const upload = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (upload.error) {
    return new Response(JSON.stringify({ error: "Upload failed", details: upload.error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicUrl = makePublic
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : (await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7)).data?.signedUrl;

  return new Response(JSON.stringify({
    bucket,
    path,
    publicUrl: publicUrl || null,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});