"use client";

import * as React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import CreativeBriefForm from "@/components/CreativeBriefForm";
import PromptPreview from "@/components/PromptPreview";
import AnalyzeImagePanel from "@/components/AnalyzeImagePanel";
import KieConsole from "@/components/KieConsole";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { buildVeoPrompt } from "@/utils/veoPrompt";
import { Link } from "react-router-dom";

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
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [showKie, setShowKie] = React.useState(false);

  // When brief or image changes, trigger analysis and prompt generation
  React.useEffect(() => {
    if (!brief || !directImageUrl) {
      setAnalysis(undefined);
      setScenes(undefined);
      return;
    }

    let cancelled = false;

    async function analyzeAndGenerate() {
      setLoadingAnalysis(true);
      setAnalysis(undefined);
      setAnalysisError(null);

      // Analyze image
      let analysisResult: ImageAnalysis | null = null;
      try {
        const { data, error } = await supabase.functions.invoke("analyze-image", {
          body: { imageUrl: directImageUrl },
        });
        if (error) throw new Error(error.message || "Image analysis failed");
        analysisResult = (data?.analysis ?? null) as ImageAnalysis | null;
        if (!cancelled) setAnalysis(analysisResult);
      } catch (e: any) {
        if (!cancelled) {
          setAnalysisError(e?.message || "Image analysis failed");
          setAnalysis(null);
        }
      } finally {
        setLoadingAnalysis(false);
      }

      // Generate scenes, always referencing image and analysis
      if (!cancelled) {
        const scenes = buildScenesWithAnalysis(brief, directImageUrl, analysisResult);
        setScenes(scenes);
      }
    }

    analyzeAndGenerate();

    return () => {
      cancelled = true;
    };
  }, [brief, directImageUrl]);

  // Helper: build scenes with image and analysis
  function buildScenesWithAnalysis(
    brief: CreativeBrief,
    directImageUrl: string,
    analysis: ImageAnalysis | null
  ): SceneOutput[] {
    // Explicitly type the return value for ratio
    const ratio: { video: "9:16" | "3:4" | "16:9"; image: "9:16" | "3:4" | "16:9" } = (() => {
      switch (brief.aspectRatio) {
        case "vertical_9_16":
          return { video: "9:16", image: "9:16" };
        case "portrait_3_4":
          return { video: "3:4", image: "3:4" };
        case "landscape_16_9":
          return { video: "16:9", image: "16:9" };
        default:
          return { video: "9:16", image: "9:16" };
      }
    })();

    const baseDesc =
      analysis?.visual_description ||
      "A product image provided by the user. Brand/style cues may be present.";
    const brand = analysis?.brand_name || "the product";
    const colors = (analysis?.color_scheme || []).join(", ");
    const font = analysis?.font_style || "";
    const imageMention = `Reference image: ${directImageUrl}`;
    const analysisMention = `Description: ${baseDesc}${brand ? `; Brand: ${brand}` : ""}${colors ? `; Colors: ${colors}` : ""}${font ? `; Font: ${font}` : ""}`;

    const sceneHints = (brief.specialRequests || "")
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const pool =
      sceneHints.length > 0
        ? sceneHints
        : [
            "casual vlog selfie at home, natural light, minimal makeup",
            "in-car testimonial, dash-mounted phone, daylight reflections",
            "podcast-style medium shot at desk, soft lamp light, cozy background",
            "mirror selfie in bathroom, handheld angle, imperfect framing",
            "walking-and-talking outside, sidewalk background, ambient city sounds",
          ];

    const scenes: SceneOutput[] = [];
    for (let i = 0; i < brief.numberOfVideos; i++) {
      const baseScene = pool[i % pool.length];
      const character =
        brief.influencerDescription ||
        "normal and casual looking person, authentic, relatable";
      const special = brief.specialRequests || "";

      const script =
        brief.dialogueMode === "provide"
          ? brief.scriptText || ""
          : `Hi… I’ve been trying this product for a week now… and honestly I love it… It’s simple… looks great… and does exactly what I need… You should definitely check it out…`;

      const imagePrompt = [
        `Unremarkable amateur iPhone photo… ${baseScene}…`,
        `Product from reference image is clearly visible…`,
        `Casual framing, slight motion blur acceptable, realistic lighting…`,
        `Character: ${character}…`,
        special ? `Details: ${special}…` : "",
        imageMention,
        analysisMention,
        `No watermarks… realistic textures… no text overlays…`,
      ]
        .filter(Boolean)
        .join(" ");

      const videoPrompt = [
        `UGC style video… ${baseScene}…`,
        `Focus on product from reference image…`,
        `Casual, authentic tone… realistic audio ambience…`,
        `Dialogue: ${script}`,
        imageMention,
        analysisMention,
        `Prompt rules: use ellipses for pauses… avoid hyphenation issues… no double quotes in content…`,
      ].join(" ");

      scenes.push({
        id: `${i + 1}`,
        imagePrompt,
        videoPrompt,
        videoAspectRatio: ratio.video,
        imageAspectRatio: ratio.image,
        model: brief.modelChoice,
      });
    }
    return scenes;
  }

  // The first scene is used for KIE Console template
  const firstScene = scenes?.[0];
  const kieTemplate =
    firstScene && directImageUrl
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

        <div className="flex justify-center my-4">
          <Link
            to="/ugc-studio"
            className="inline-block px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 transition"
          >
            Try the new UGC Studio &rarr;
          </Link>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Step 1: Product/Brand Brief */}
          <CreativeBriefForm
            onBriefChange={(b, direct) => {
              setBrief(b);
              setDirectImageUrl(direct);
              // analysis/scenes will be handled by effect
            }}
          />

          {/* Step 2: Preview & Export */}
          <PromptPreview
            brief={brief}
            scenes={scenes}
            directImageUrl={directImageUrl}
            analysis={analysis ?? null}
          />

          {/* Step 3: (Optional) Analyze Image */}
          {directImageUrl && (
            <AnalyzeImagePanel
              directImageUrl={directImageUrl}
              onAnalysis={(a) => setAnalysis(a ?? null)}
            />
          )}

          {/* Loading/Error states for analysis */}
          {loadingAnalysis && (
            <div className="text-sm text-blue-600">Analyzing image and generating prompts…</div>
          )}
          {analysisError && (
            <div className="text-sm text-destructive">Image analysis failed: {analysisError}</div>
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