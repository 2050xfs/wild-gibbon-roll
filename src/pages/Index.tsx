"use client";

import * as React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import CreativeBriefForm from "@/components/CreativeBriefForm";
import PromptPreview from "@/components/PromptPreview";
import AnalyzeImagePanel from "@/components/AnalyzeImagePanel";
import KieConsole from "@/components/KieConsole";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ImageAnalysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

const Index = () => {
  const [brief, setBrief] = React.useState<CreativeBrief | undefined>(undefined);
  const [scenes, setScenes] = React.useState<SceneOutput[] | undefined>(undefined);
  const [directImageUrl, setDirectImageUrl] = React.useState<string | undefined>(undefined);
  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null | undefined>(undefined);

  const hasDirectImage = !!directImageUrl;

  // Prefill a reasonable KIE request body template from Scene 1
  const firstScene = scenes?.[0];
  const kieTemplate = firstScene && directImageUrl
    ? {
        // Adjust fields according to KIE docs if needed:
        prompt: firstScene.videoPrompt,
        aspect_ratio: firstScene.videoAspectRatio, // e.g., "9:16"
        model: brief?.modelChoice === "V3 Fast" ? "veo3-1-fast" : "veo3-1",
        init_image_url: directImageUrl,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Infinite UGC Prompt Factory</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate structured image/video prompts for automated UGC creation. Plug these into your n8n workflow.
          </p>
        </div>

        <Alert>
          <AlertTitle>Next step: Backend for media generation</AlertTitle>
          <AlertDescription>
            You can now analyze your product image (Step 2). To fully automate Steps 5–11 (image/video generation + uploads), we’ll add secure functions next.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          <CreativeBriefForm
            onScenesReady={(b, s, direct) => {
              setBrief(b);
              setScenes(s);
              setDirectImageUrl(direct);
              setAnalysis(undefined);
            }}
          />

          <PromptPreview brief={brief} scenes={scenes} directImageUrl={directImageUrl} analysis={analysis ?? null} />

          {hasDirectImage && (
            <AnalyzeImagePanel
              directImageUrl={directImageUrl}
              onAnalysis={(a) => setAnalysis(a ?? null)}
            />
          )}

          <KieConsole
            defaultPath="/v1/veo3/videos"
            defaultMethod="POST"
            defaultBody={kieTemplate}
            title="KIE AI Proxy — Live Test"
            description="Send a request through the secure proxy to verify your KIE AI setup. The body below is prefilled from Scene 1; adjust to match the official docs."
          />
        </div>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;