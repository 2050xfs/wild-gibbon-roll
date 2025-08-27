import { supabase } from "@/integrations/supabase/client";
import { edgeUrl } from "@/utils/edge";

export type KieMethod = "GET" | "POST";

export async function kieRequest<T = unknown>(path: string, method: KieMethod = "POST", body?: unknown) {
  const { data, error } = await supabase.functions.invoke(edgeUrl("kie-proxy"), {
    body: { path, method, body },
  });
  if (error) {
    throw new Error(error.message || "KIE proxy invocation failed");
  }
  return data as { status: number; data: T };
}