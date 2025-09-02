// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const INGEST_BASE = Deno.env.get("SHOTSTACK_INGEST_BASE")!;
const API_KEY     = Deno.env.get("SHOTSTACK_API_KEY")!;

type IngestBody = { urls: string[] };

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const { urls } = (await req.json()) as IngestBody;
    if (!urls?.length) return new Response(JSON.stringify({ error: "urls required" }), { status: 400 });

    const results: any[] = [];
    for (const url of urls) {
      const res = await fetch(`${INGEST_BASE}/sources`, {
        method: "POST",
        headers: { "x-api-key": API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      results.push(data);
    }

    return new Response(JSON.stringify({ ok: true, sources: results }), {
      headers: { "content-type": "application/json" },
      status: 201,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Ingest failed" }), { status: 502 });
  }
});