"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { showSuccess } from "@/utils/toast";
import { Copy, Download } from "lucide-react";

type ImageAnalysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

type Props = {
  brief?: CreativeBrief;
  scenes?: SceneOutput[];
  directImageUrl?: string;
  analysis?: ImageAnalysis | null;
};

export default function PromptPreview({ brief, scenes, directImageUrl, analysis }: Props) {
  const hasData = brief && scenes && scenes.length > 0;

  const jsonPayload = hasData
    ? {
        meta: {
          model: brief!.modelChoice,
          aspectRatio: brief!.aspectRatio,
          numberOfVideos: brief!.numberOfVideos,
          directImageUrl: directImageUrl ?? null,
          analysis: analysis ?? null,
        },
        scenes: scenes!.map((s) => ({
          id: s.id,
          imagePrompt: s.imagePrompt,
          videoPrompt: s.videoPrompt,
          videoAspectRatio: s.videoAspectRatio,
          imageAspectRatio: s.imageAspectRatio,
          model: s.model,
        })),
      }
    : null;

  const handleCopy = async () => {
    if (!jsonPayload) return;
    await navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
    showSuccess("Scenes JSON copied to clipboard.");
  };

  const handleDownload = () => {
    if (!jsonPayload) return;
    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ugc-scenes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generated Scenes</CardTitle>
        <CardDescription>
          Structured prompts for image and video generation. Copy or download to use in n8n or your generation service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No scenes yet. Fill the brief and click “Generate Prompts”.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </div>
            <Separator />
            <div className="space-y-6">
              {scenes!.map((s) => (
                <div key={s.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Scene {s.id}</h3>
                    <div className="text-xs text-muted-foreground">
                      Model: {s.model} • Video {s.videoAspectRatio} • Image {s.imageAspectRatio}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Image Prompt</div>
                    <p className="text-muted-foreground">{s.imagePrompt}</p>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Video Prompt</div>
                    <p className="text-muted-foreground">{s.videoPrompt}</p>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}