import { supabase } from "@/integrations/supabase/client";

export type KieMethod = "GET" | "POST";

/**
 * Calls the KIE AI proxy with the correct endpoint and payload.
 * If no path is provided, defaults to /api/v1/veo/generate.
 */
export async function kieRequest<T = unknown>(
  path: string = "/api/v1/veo/generate",
  method: KieMethod = "POST",
  body?: unknown
) {
  const { data, error } = await supabase.functions.invoke("kie-proxy", {
    body: { path, method, body },
  });
  if (error) {
    throw new Error(error.message || "KIE proxy invocation failed");
  }
  // If KIE returns non-2xx, throw with details
  if (data && typeof data.status === "number" && (data.status < 200 || data.status >= 300)) {
    const msg =
      (data.data && (data.data.msg || data.data.message || data.data.error)) ||
      `KIE API error (status ${data.status})`;
    throw new Error(msg);
  }
  return data as { status: number; data: T };
}