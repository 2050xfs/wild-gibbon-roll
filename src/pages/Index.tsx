"use client";

import * as React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import CreativeBriefForm from "@/components/CreativeBriefForm";
import PromptPreview from "@/components/PromptPreview";
import AnalyzeImagePanel from "@/components/AnalyzeImagePanel";
import KieConsole from "@/components/KieConsole";
import type { CreativeBrief, SceneOutput } from "../types/ugc";

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
  const [showKie, setShowKie] = React.useState(false);

  const hasDirectImage = !!directImageUrl;
  const firstScene = scenes?.[0];
  const kieTemplate = firstScene && directImageUrl
    ? {
        prompt: firstScene.videoPrompt,
        aspectRatio: firstScene.videoAspectRatio,
        model: brief?.modelChoice === "V3 Fast" ? "veo3_fast" : "veo3",
        imageUrls: [directImageUrl],
      }
    : undefined;

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Infinite UGC Ad Generator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Instantly generate unlimited UGC-style ads for any product or brand—completely on autopilot.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Step 1: Product/Brand Brief */}
          <CreativeBriefForm
            onScenesReady={(b, s, direct) => {
              setBrief(b);
              setScenes(s);
              setDirectImageUrl(direct);
              setAnalysis(undefined);
            }}
          />

          {/* Step 2: Preview & Export */}
          <PromptPreview brief={brief} scenes={scenes} directImageUrl={directImageUrl} analysis={analysis ?? null} />

          {/* Step 3: (Optional) Analyze Image */}
          {hasDirectImage && (
            <AnalyzeImagePanel
              directImageUrl={directImageUrl}
              onAnalysis={(a) => setAnalysis(a ?? null)}
            />
          )}

          {/* Step 4: (Optional) Test with KIE AI */}
          {firstScene && directImageUrl && (
            <div className="text-right">
              <button
                className="text-xs text-blue-600 underline mb-2"
                onClick={() => setShowKie((v) => !v)}
              >
                {showKie ? "Hide" : "Test with KIE AI (advanced)"}
              </button>
              {showKie && (
                <KieConsole
                  defaultPath="/api/v1/veo/generate"
                  defaultMethod="POST"
                  defaultBody={kieTemplate}
                  title="KIE AI Proxy — Live Test"
                  description="Send a request through the secure proxy to verify your KIE AI setup. The body below is prefilled from Scene 1; adjust to match the official docs."
                />
              )}
            </div>
          )}
        </div>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;