import * as React from "react";

export function usePromptLibrary() {
  const [prompts, setPrompts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPrompts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/functions/v1/list-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch prompts");
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch prompts");
    } finally {
      setLoading(false);
    }
  }, []);

  const savePrompt = React.useCallback(async ({
    name,
    prompt_json,
    fingerprint,
    template_version,
  }: {
    name: string;
    prompt_json: any;
    fingerprint: string;
    template_version: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/rest/v1/prompt_library", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({
          name,
          prompt_json,
          fingerprint,
          template_version,
        }),
      });
      if (!res.ok) throw new Error("Failed to save prompt");
      await fetchPrompts();
    } catch (e: any) {
      setError(e?.message || "Failed to save prompt");
    } finally {
      setLoading(false);
    }
  }, [fetchPrompts]);

  return { prompts, loading, error, fetchPrompts, savePrompt };
}