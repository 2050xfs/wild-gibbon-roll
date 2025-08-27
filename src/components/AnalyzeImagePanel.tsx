"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { showError, showSuccess } from "@/utils/toast";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/integrations/supabase/client";
import { Wand2 } from "lucide-react";

type Analysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

type Props = {
  directImageUrl?: string;
  onAnalysis?: (a?: Analysis | null) => void;
};

export default function AnalyzeImagePanel({ directImageUrl, onAnalysis }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Analysis | null | undefined>(undefined);

  const canAnalyze = !!directImageUrl;

  const handleAnalyze = async () => {
    if (!directImageUrl) {
      showError("Please provide a valid image link first.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageUrl: directImageUrl },
      });
      if (error) {
        showError(error.message || "Analysis failed.");
        setResult(null);
        onAnalysis?.(null);
        return;
      }
      const analysis = (data?.analysis ?? null) as Analysis | null;
      setResult(analysis);
      onAnalysis?.(analysis);
      showSuccess("Image analyzed successfully.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analyze Product Image</CardTitle>
        <CardDescription>
          Extract brand cues and visual context from your product image to inform prompt generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canAnalyze ? (
          <p className="text-sm text-muted-foreground">
            Add a Google Drive share link in the brief first. We’ll convert it to a direct URL automatically.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={handleAnalyze} disabled={loading}>
              <Wand2 className="h-4 w-4 mr-2" />
              {loading ? "Analyzing…" : "Analyze Product Image"}
            </Button>
            <span className="text-xs text-muted-foreground break-all">{directImageUrl}</span>
          </div>
        )}

        {result !== undefined && (
          <>
            <Separator />
            {result ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Brand:</span>
                  <Badge variant="secondary">{result.brand_name || "Unknown"}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Font style:</span>
                  <Badge variant="outline">{result.font_style || "Unspecified"}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Color scheme:</div>
                  <div className="flex flex-wrap gap-2">
                    {(result.color_scheme || []).map((hex) => (
                      <div key={hex} className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded border" style={{ backgroundColor: hex || "#ccc" }} />
                        <span className="text-xs text-muted-foreground">{hex}</span>
                      </div>
                    ))}
                    {(!result.color_scheme || result.color_scheme.length === 0) && (
                      <span className="text-xs text-muted-foreground">None detected</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Visual description:</div>
                  <p className="text-sm text-muted-foreground">
                    {result.visual_description || "No description available."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">Could not analyze this image.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}