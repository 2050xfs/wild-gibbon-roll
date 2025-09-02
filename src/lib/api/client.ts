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
  const res = await fetch(`/rest/v1/renders?id=eq.${encodeURIComponent(renderId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function ingestSources(urls: string[]): Promise<{ ok: boolean; sources: any[] }> {
  return apiPost<{ ok: boolean; sources: any[] }>("/functions/v1/ingest-source", { urls });
}

export async function selectSceneVersion(versionId: string): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>("/functions/v1/scenes-select-version", { versionId });
}

export async function getSceneVersions(sceneId: string): Promise<any[]> {
  const res = await fetch(`/rest/v1/scene_versions?scene_id=eq.${encodeURIComponent(sceneId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}