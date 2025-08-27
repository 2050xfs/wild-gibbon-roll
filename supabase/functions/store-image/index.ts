// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts"
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getDriveDirectUrl(url: string): string | null {
  // Extract file ID from various Google Drive link formats
  const fileIdMatch =
    url.match(/\/file\/d\/([^/]+)/)?.[1] ||
    url.match(/[?&]id=([^&]+)/)?.[1] ||
    url.match(/(?:uc|thumbnail)\?id=([^&]+)/)?.[1];
  if (!fileIdMatch) return null;
  return `https://drive.google.com/uc?export=download&id=${fileIdMatch}`;
}

function isHttpUrl(s?: string): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function normalizeMime(ct?: string | null): string | null {
  if (!ct) return null;
  const base = ct.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  return base;
}

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

  let body: { imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let imageUrl = body.imageUrl?.trim();
  if (!imageUrl || !isHttpUrl(imageUrl)) {
    return new Response(JSON.stringify({ error: "imageUrl is required and must be a valid http(s) URL" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Convert Google Drive links to direct download
  if (imageUrl.includes("drive.google.com")) {
    const direct = getDriveDirectUrl(imageUrl);
    if (direct) imageUrl = direct;
  }

  // Download the image
  const upstream = await fetch(imageUrl);
  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "Failed to fetch image", status: upstream.status, details }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const contentType = normalizeMime(upstream.headers.get("content-type"));
  const buf = new Uint8Array(await upstream.arrayBuffer());
  if (!buf.length) {
    return new Response(JSON.stringify({ error: "Downloaded image is empty" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ensure supported image format; if unknown/unsupported, re-encode to PNG
  let finalBytes: Uint8Array;
  let finalMime: string;
  let ext: string;

  if (!contentType || !ALLOWED_MIME.has(contentType)) {
    // Attempt to decode and re-encode as PNG
    try {
      const img = await Image.decode(buf);
      finalBytes = await img.encode(); // PNG by default
      finalMime = "image/png";
      ext = "png";
    } catch (_e) {
      return new Response(
        JSON.stringify({
          error: "Unsupported or unreadable image format. Could not convert to PNG.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } else {
    // Use original bytes and content type
    finalBytes = buf;
    finalMime = contentType === "image/jpg" ? "image/jpeg" : contentType;
    ext = finalMime.split("/")[1] || "png";
  }

  // Store in Supabase Storage
  const bucket = "ugc-images";
  const filename = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Ensure bucket exists and is public
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) {
    await supabase.storage.createBucket(bucket, { public: true });
  } else if (existing.data.public === false) {
    await supabase.storage.updateBucket(bucket, { public: true });
  }

  // Upload to storage
  const upload = await supabase.storage.from(bucket).upload(filename, finalBytes, {
    contentType: finalMime,
    upsert: false,
  });

  if (upload.error) {
    return new Response(JSON.stringify({ error: "Upload failed", details: upload.error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(filename).data.publicUrl;

  return new Response(JSON.stringify({
    bucket,
    path: filename,
    publicUrl: publicUrl || null,
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});