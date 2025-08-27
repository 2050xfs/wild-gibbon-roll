import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an image from any public URL (including Google Drive) to Supabase Storage.
 * Returns the Supabase public URL.
 */
export async function storeImageFromUrl(imageUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("store-image", {
    body: { imageUrl },
  });
  if (error) throw new Error(error.message || "Failed to store image");
  if (!data?.publicUrl) throw new Error("No public URL returned from store-image");
  return data.publicUrl as string;
}