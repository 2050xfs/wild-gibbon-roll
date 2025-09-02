// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function assertInput(b: any) {
  if (!b || typeof b !== "object") throw new Error("body required");
  if (!b.numScenes || b.numScenes < 1 || b.numScenes > 10) throw new Error("numScenes 1..10");
  if (!["9:16","16:9","1:1"].includes(b.aspect)) throw new Error("aspect invalid");
  if (!["manual","ai"].includes(b.scriptMode)) throw new Error("scriptMode invalid");
}

async function sha256Hex(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json();
    assertInput(body);

    // Server guardrails
    body.numScenes = Math.min(Math.max(body.numScenes, 1), 6);
    if (body.scriptMode === "manual" && body.scriptText?.length > 2000) {
      body.scriptText = body.scriptText.slice(0, 2000);
    }

    // Build JSON scenes (could import shared builder logic here)
    const scenes: any[] = []; // TODO: implement or import builder logic

    // Version & provenance
    const templateVersion = "veo-json@2025-09-01";
    const fingerprint = await sha256Hex(JSON.stringify({ templateVersion, scenes }));

    return new Response(JSON.stringify({ templateVersion, promptId: fingerprint, scenes }), {
      headers: { "content-type": "application/json" },
      status: 201
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  }
});