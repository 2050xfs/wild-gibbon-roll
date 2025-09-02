export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function getRenderStatus(renderId: string): Promise<{
  id: string;
  status: string;
  url?: string;
  poster?: string;
  thumbnail?: string;
  error?: string;
  updated_at?: string;
} | null> {
  // Assumes you have a public REST endpoint for renders (Supabase REST or Edge Function)
  const res = await fetch(`/rest/v1/renders?id=eq.${encodeURIComponent(renderId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}