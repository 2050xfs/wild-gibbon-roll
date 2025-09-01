// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
const SHOTSTACK_BASE = "https://api.shotstack.io/edit/stage"; // Use 'v1' for production

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
    }

    const {
      sceneUrls,
      order,
      transition = "none",
      aspect = "9:16",
      endCard,
      resolution = "1080",
      fps = 30,
      webhookUrl,
    } = body;

    if (!Array.isArray(sceneUrls) || sceneUrls.length < 1) {
      return new Response(JSON.stringify({ error: "sceneUrls must be a non-empty array" }), { status: 400, headers: corsHeaders });
    }

    // Order the scene URLs as per the order array if provided
    let orderedUrls = sceneUrls;
    if (Array.isArray(order) && order.length === sceneUrls.length) {
      orderedUrls = order.map((id) => sceneUrls.find((url) => url.includes(id)) || sceneUrls[0]);
    }

    // Build Shotstack clips
    const clips = orderedUrls.map((url, idx) => {
      const clip = {
        asset: { type: "video", src: url, fit: "cover" },
        start: idx === 0 ? 0 : "auto",
        length: "auto",
      };
      // Add transitions if requested
      if (transition === "crossfade") {
        if (idx === 0) clip.transition = { out: "fade" };
        else if (idx === orderedUrls.length - 1) clip.transition = { in: "fade" };
        else clip.transition = { in: "fade", out: "fade" };
      }
      return clip;
    });

    // Add end card as a final image or video clip if provided
    if (endCard && typeof endCard === "string" && endCard.trim().length > 0) {
      clips.push({
        asset: { type: "image", src: endCard, fit: "cover" },
        start: "auto",
        length: 2, // 2 seconds for end card
      });
    }

    // Build the Shotstack Edit JSON
    const edit = {
      timeline: {
        tracks: [{ clips }],
      },
      output: {
        format: "mp4",
        resolution,
        aspectRatio: aspect,
        fps,
      },
    };

    if (webhookUrl) {
      edit["callback"] = webhookUrl;
    }

    // POST to Shotstack
    const shotstackRes = await fetch(`${SHOTSTACK_BASE}/render`, {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(edit),
    });

    const shotstackData = await shotstackRes.json();

    if (!shotstackRes.ok) {
      return new Response(JSON.stringify({ error: "Shotstack error", details: shotstackData }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    // Return the render id and status
    return new Response(JSON.stringify({ renderId: shotstackData.response?.id, status: shotstackData.response?.status || "queued" }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  // GET /reels-stitch?id=RENDER_ID → poll Shotstack for status/result
  if (req.method === "GET") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id param" }), { status: 400, headers: corsHeaders });
    }
    const statusRes = await fetch(`${SHOTSTACK_BASE}/render/${id}`, {
      headers: { "x-api-key": SHOTSTACK_API_KEY },
    });
    const statusData = await statusRes.json();
    if (!statusRes.ok) {
      return new Response(JSON.stringify({ error: "Shotstack status error", details: statusData }), {
        status: 502,
        headers: corsHeaders,
      });
    }
    return new Response(JSON.stringify(statusData.response), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
});