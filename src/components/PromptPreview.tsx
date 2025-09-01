"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { showSuccess, showError } from "@/utils/toast";
import { Copy, Download, Send, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildVeoPrompt } from "@/utils/veoPrompt";

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
  | { state: "pending"; taskId: string }
  | { state: "success"; resultUrl: string }
  | { state: "error"; error: string };

const POLL_INTERVAL = 4000;

export default function PromptPreview({ brief, scenes, directImageUrl, analysis }: Props) {
  const hasData = brief && scenes && scenes.length > 0;

  // Track status/result for each scene by id
  const [sceneStatus, setSceneStatus] = React.useState<Record<string, SceneStatus>>({});
  // Track which scene's panel is open
  const [openPanel, setOpenPanel] = React.useState<string | null>(null);

  // Polling state for video result
  const pollForResult = React.useCallback(async (sceneId: string, taskId: string) => {
    let attempts = 0;
    let found = false;
    while (attempts < 225 && !found) { // up to 15 min (225*4s)
      attempts++;
      // Call backend to get status for this taskId
      const { data, error } = await supabase.functions.invoke("get-kie-task-status", { body: { taskIds: [taskId] } });
      if (error) {
        setSceneStatus((prev) => ({
          ...prev,
          [sceneId]: { state: "error", error: error.message || "Failed to poll for result" },
        }));
        return;
      }
      const result = data?.results?.[0]?.kie?.data;
      if (result && result.successFlag === 1 && result.resultUrls) {
        let urls: string[] = [];
        try { urls = JSON.parse(result.resultUrls); } catch {}
        const videoUrl = urls[0];
        if (videoUrl) {
          setSceneStatus((prev) => ({
            ...prev,
            [sceneId]: { state: "success", resultUrl: videoUrl },
          }));
          found = true;
          return;
        }
      }
      if (result && (result.successFlag === 2 || result.successFlag === 3)) {
        setSceneStatus((prev) => ({
          ...prev,
          [sceneId]: { state: "error", error: "Generation failed" },
        }));
        return;
      }
      // Wait before next poll
      await new Promise((res) => setTimeout(res, POLL_INTERVAL));
    }
    if (!found) {
      setSceneStatus((prev) => ({
        ...prev,
        [sceneId]: { state: "error", error: "Timed out waiting for result" },
      }));
    }
  }, []);

  // Send a single scene to KIE AI and open panel
  const sendToKie = async (scene: SceneOutput) => {
    if (!brief) return;
    setSceneStatus((prev) => ({
      ...prev,
      [scene.id]: { state: "pending", taskId: "" },
    }));
    setOpenPanel(scene.id);
    try {
      // Build Veo 3 JSON prompt
      const veoPrompt = buildVeoPrompt(brief, scene, analysis);
      const payload = {
        prompt: veoPrompt,
        aspectRatio: scene.videoAspectRatio,
        model: scene.model === "V3 Fast" ? "veo3_fast" : "veo3",
        imageUrls: directImageUrl ? [directImageUrl] : [],
      };
      const { data, error } = await supabase.functions.invoke("create-video-task", { body: payload });

      // FIX: If a taskId is returned, treat as success and start polling, even if error is present
      if (data?.taskId) {
        setSceneStatus((prev) => ({
          ...prev,
          [scene.id]: { state: "pending", taskId: data.taskId },
        }));
        showSuccess("Sent to KIE AI! Generation started.");
        pollForResult(scene.id, data.taskId);
        return;
      }

      // Only show error if no taskId is returned
      setSceneStatus((prev) => ({
        ...prev,
        [scene.id]: { state: "error", error: error?.message || "Failed to send to KIE AI" },
      }));
      showError(error?.message || "Failed to send to KIE AI");
    } catch (e: any) {
      setSceneStatus((prev) => ({
        ...prev,
        [scene.id]: { state: "error", error: e?.message || "Failed to send to KIE AI" },
      }));
      showError(e?.message || "Failed to send to KIE AI");
    }
  };

  const handleCopy = async () => {
    if (!hasData) return;
    const jsonPayload = {
      meta: {
        model: brief!.modelChoice,
        aspectRatio: brief!.aspectRatio,
        numberOfVideos: brief!.numberOfVideos,
        directImageUrl: directImageUrl ?? null,
        analysis: analysis ?? null,
      },
      scenes: scenes!.map((s) => ({
        id: s.id,
        veoPrompt: buildVeoPrompt(brief!, s, analysis),
      })),
    };
    await navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
    showSuccess("Scenes JSON copied to clipboard.");
  };

  const handleDownload = () => {
    if (!hasData) return;
    const jsonPayload = {
      meta: {
        model: brief!.modelChoice,
        aspectRatio: brief!.aspectRatio,
        numberOfVideos: brief!.numberOfVideos,
        directImageUrl: directImageUrl ?? null,
        analysis: analysis ?? null,
      },
      scenes: scenes!.map((s) => ({
        id: s.id,
        veoPrompt: buildVeoPrompt(brief!, s, analysis),
      })),
    };
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
          Structured JSON prompts for Veo 3 video generation. Copy, download, or send to KIE AI.
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
                const isPanelOpen = openPanel === s.id;
                const veoPrompt = buildVeoPrompt(brief!, s, analysis);
                return (
                  <div key={s.id} className="relative flex flex-col md:flex-row gap-4 border rounded p-4 bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Scene {s.id}</h3>
                        <div className="text-xs text-muted-foreground">
                          Model: {s.model} • Video {s.videoAspectRatio} • Image {s.imageAspectRatio}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold mb-1">Veo 3 JSON Prompt</div>
                        <pre className="bg-background rounded p-2 text-xs overflow-x-auto max-h-60">
                          {JSON.stringify(veoPrompt, null, 2)}
                        </pre>
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
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Pending...
                          </span>
                        )}
                        {status === "success" && (
                          <span className="flex items-center text-xs text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Complete!
                          </span>
                        )}
                        {status === "error" && (
                          <span className="flex items-center text-xs text-destructive">
                            <XCircle className="h-4 w-4 mr-1" /> {sceneState && "error" in sceneState ? sceneState.error : ""}
                          </span>
                        )}
                        {isPanelOpen ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="ml-2"
                            onClick={() => setOpenPanel(null)}
                            aria-label="Close panel"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {/* Side panel for status/result */}
                    {isPanelOpen && (
                      <div className="w-full md:w-80 border-l md:pl-4 pt-4 md:pt-0 bg-background rounded flex flex-col items-center">
                        {status === "pending" && (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <div className="text-sm text-muted-foreground">Waiting for video generation…</div>
                          </div>
                        )}
                        {status === "success" && sceneState && "resultUrl" in sceneState && (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <video
                              src={sceneState.resultUrl}
                              controls
                              className="rounded w-full max-w-xs"
                            />
                            <a
                              href={sceneState.resultUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              View/Download Video
                            </a>
                          </div>
                        )}
                        {status === "error" && sceneState && "error" in sceneState && (
                          <div className="text-sm text-destructive">{sceneState.error}</div>
                        )}
                      </div>
                    )}
                    <Separator className="md:hidden" />
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