"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

type Analysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

type Props = {
  imageUrl: string;
  onAnalysis?: (a?: Analysis | null) => void;
};

export default function ImageReferenceWithAnalysis({ imageUrl, onAnalysis }: Props) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<Analysis | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
      setPreviewUrl(null);
      setAnalysis(undefined);
      setError(null);
      onAnalysis?.(null);
      return;
    }
    setPreviewUrl(imageUrl);
    setLoading(true);
    setError(null);
    setAnalysis(undefined);
    async function analyze() {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-image", {
          body: { imageUrl },
        });
        if (error) throw new Error(error.message || "Analysis failed");
        setAnalysis(data?.analysis ?? null);
        onAnalysis?.(data?.analysis ?? null);
      } catch (e: any) {
        setAnalysis(null);
        setError(e?.message || "Analysis failed");
        onAnalysis?.(null);
      } finally {
        setLoading(false);
      }
    }
    analyze();
    // eslint-disable-next-line
  }, [imageUrl]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Product Image & Brand Cues</CardTitle>
        <CardDescription>
          Paste a public image URL. The preview and brand cues will appear below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!previewUrl ? (
          <div className="text-muted-foreground text-sm">Paste a valid image URL to preview and analyze.</div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-40 rounded border"
              onError={() => setPreviewUrl(null)}
            />
            <span className="text-xs text-muted-foreground break-all">{previewUrl}</span>
            <Separator className="my-2" />
            {loading && <div className="text-blue-600 text-sm">Analyzing image…</div>}
            {error && <div className="text-destructive text-sm">Analysis failed: {error}</div>}
            {analysis && (
              <div className="w-full text-left space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Brand:</span>
                  <Badge variant="secondary">{analysis.brand_name || "Unknown"}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Font style:</span>
                  <Badge variant="outline">{analysis.font_style || "Unspecified"}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Color scheme:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(analysis.color_scheme || []).map((hex) => (
                      <div key={hex || ""} className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded border" style={{ backgroundColor: hex || "#ccc" }} />
                        <span className="text-xs text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                    {(!analysis.color_scheme || analysis.color_scheme.length === 0) && (
                      <span className="text-xs text-muted-foreground">None detected</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium">Visual description:</span>
                  <p className="text-sm text-muted-foreground">
                    {analysis.visual_description || "No description available."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}