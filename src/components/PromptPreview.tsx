"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { showSuccess, showError } from "@/utils/toast";
import { Copy, Download, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

type SceneStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "success"; resultUrl?: string }
  | { state: "error"; error: string };

export default function PromptPreview({ brief, scenes, directImageUrl, analysis }: Props) {
  const hasData = brief && scenes && scenes.length > 0;

  // Track status/result for each scene by id
  const [sceneStatus, setSceneStatus] = React.useState<Record<string, SceneStatus>>({});

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

  // Send a single scene to KIE AI
  const sendToKie = async (scene: SceneOutput) => {
    setSceneStatus((prev) => ({
      ...prev,
      [scene.id]: { state: "pending" },
    }));
    try {
      // Build payload for KIE AI
      const payload = {
        prompt: scene.videoPrompt,
        aspectRatio: scene.videoAspectRatio,
        model: scene.model === "V3 Fast" ? "veo3_fast" : "veo3",
        imageUrls: directImageUrl ? [directImageUrl] : [],
      };
      const { data, error } = await supabase.functions.invoke("create-video-task", { body: payload });
      if (error) {
        setSceneStatus((prev) => ({
          ...prev,
          [scene.id]: { state: "error", error: error.message || "Failed to send to KIE AI" },
        }));
        showError(error.message || "Failed to send to KIE AI");
        return;
      }
      // Success: show a success state and link to task (if available)
      setSceneStatus((prev) => ({
        ...prev,
        [scene.id]: { state: "success", resultUrl: data?.taskId ? undefined : undefined },
      }));
      showSuccess("Sent to KIE AI! Generation started.");
    } catch (e: any) {
      setSceneStatus((prev) => ({
        ...prev,
        [scene.id]: { state: "error", error: e?.message || "Failed to send to KIE AI" },
      }));
      showError(e?.message || "Failed to send to KIE AI");
    }
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
              {scenes!.map((s) => {
                const sceneState = sceneStatus[s.id];
                const status = sceneState?.state || "idle";
                let errorMsg: string | undefined = undefined;
                let resultUrl: string | undefined = undefined;
                if (sceneState?.state === "error") {
                  errorMsg = sceneState.error;
                }
                if (sceneState?.state === "success") {
                  resultUrl = sceneState.resultUrl;
                }
                return (
                  <div key={s.id} className="space-y-2 border rounded p-4 bg-muted/50">
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
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => sendToKie(s)}
                        disabled={status === "pending"}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {status === "pending" ? "Sending..." : "Send to KIE AI"}
                      </Button>
                      {status === "pending" && (
                        <span className="flex items-center text-xs text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin mr-1" /> Pending...
                        </span>
                      )}
                      {status === "success" && (
                        <span className="flex items-center text-xs text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Sent! Generation started.
                        </span>
                      )}
                      {status === "error" && (
                        <span className="flex items-center text-xs text-destructive">
                          <XCircle className="h-4 w-4 mr-1" /> {errorMsg}
                        </span>
                      )}
                    </div>
                    {/* Future: Show resultUrl/video preview here if available */}
                    <Separator />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}