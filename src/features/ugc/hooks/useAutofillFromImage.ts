import * as React from "react";

type CreativeBrief = any; // Replace with your type if available
type VeoScene = any;

export function useAutofillFromImage() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creativeBrief, setCreativeBrief] = React.useState<CreativeBrief | null>(null);
  const [scenes, setScenes] = React.useState<VeoScene[] | null>(null);
  const [confidence, setConfidence] = React.useState<any>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const autofill = React.useCallback(async ({
    imageUrl,
    platform,
    scriptMode,
    themeHint,
  }: {
    imageUrl: string;
    platform?: string;
    scriptMode: "ai" | "manual";
    themeHint?: string;
  }) => {
    setLoading(true);
    setError(null);
    setCreativeBrief(null);
    setScenes(null);
    setConfidence(null);
    setWarnings([]);
    try {
      const res = await fetch("/functions/v1/autofill-from-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, platform, scriptMode, themeHint }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Autofill failed");
      }
      const data = await res.json();
      setCreativeBrief(data.creative_brief);
      setScenes(data.scenes);
      setConfidence(data.confidence);
      setWarnings(data.warnings || []);
    } catch (e: any) {
      setError(e?.message || "Autofill failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    creativeBrief,
    scenes,
    confidence,
    warnings,
    autofill,
  };
}