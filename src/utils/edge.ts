export const SUPABASE_PROJECT_ID = "qbllfnlxknpncujqatlj";

// Returns full Supabase Edge Function URL, e.g. https://PROJECT_ID.supabase.co/functions/v1/name
export function edgeUrl(name: string) {
  return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${name}`;
}