// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type StitchBody = {
  sceneUrls: string[];
  aspectRatio?: "9:16" | "16:9" | "1:1";
  fps?: number;
  resolution?: "hd" | "1080" | "2160";
  transition?: "none" | "fade";
  endCard?: { text?: string; imageUrl?: string } | null;
};

const EDIT_BASE = Deno.env.get("SHOTSTACK_EDIT_BASE")!;
const API_KEY   = Deno.env.get("SHOTSTACK_API_KEY")!;
const CALLBACK  = Deno.env.get("PUBLIC_WEBHOOK_URL")!;

function buildClips(urls: string[], useFade: boolean): any[] {
  return urls.map((src, i) => {
    const clip: any = {
      asset: { type: "video", src },
      start: i === 0 ? 0 : "auto",
      length: "auto",
      fit: "cover",
    };
    if (useFade) {
      if (i === 0) clip.transition = { out: "fade" };
      else if (i === urls.length - 1) clip.transition = { in: "fade" };
      else clip.transition = { in: "fade", out: "fade" };
    }
    return clip;
  });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const {
      sceneUrls,
      aspectRatio = "9:16",
      fps = 30,
      resolution = "1080",
      transition = "fade",
      endCard = null,
    } = (await req.json()) as StitchBody;

    if (!sceneUrls?.length || sceneUrls.length < 2) {
      return new Response(JSON.stringify({ error: "Need >=2 sceneUrls" }), { status: 400 });
    }

    const clips = buildClips(sceneUrls, transition === "fade");

    if (endCard?.imageUrl || endCard?.text) {
      const asset = endCard.imageUrl
        ? { type: "image", src: endCard.imageUrl }
        : { type: "title", text: endCard.text, style: "minimal" };
      clips.push({
        asset,
        start: "auto",
        length: 2,
        fit: "contain",
        transition: { in: "fade" },
      });
    }

    const edit = {
      timeline: { tracks: [{ clips }] },
      output: { format: "mp4", resolution, aspectRatio, fps },
      callback: CALLBACK,
    };

    const res = await fetch(`${EDIT_BASE}/render`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(edit),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Shotstack error", data);
      return new Response(JSON.stringify({ error: "Shotstack render failed", data }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, renderId: data.response?.id || data.id }), {
      headers: { "content-type": "application/json" },
      status: 201,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  }
});