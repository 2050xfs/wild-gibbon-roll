import * as React from "react";
import ImageReferenceWithAnalysis from "@/features/ugc/components/ImageReferenceWithAnalysis";
import CreativeBrief from "@/features/ugc/components/CreativeBrief";
import SceneCard from "@/features/ugc/components/SceneCard";
import BatchBar from "@/features/ugc/components/BatchBar";
import OutputsPanel from "@/features/ugc/components/OutputsPanel";
import StitchModal from "@/features/ugc/components/StitchModal";
import { useUgcStore } from "@/features/ugc/state/ugcStore";
import { Button } from "@/components/ui/button";
import PromptPreview from "@/components/PromptPreview";
import type { CreativeBrief as BriefType, SceneOutput } from "@/types/ugc";

type ImageAnalysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

const UgcStudio = () => {
  const { scenes } = useUgcStore();
  const [stitchOpen, setStitchOpen] = React.useState(false);

  // Local state for brief, image, analysis, and prompts
  const [brief, setBrief] = React.useState<BriefType | undefined>(undefined);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [prompts, setPrompts] = React.useState<SceneOutput[] | undefined>(undefined);
  const [promptsReady, setPromptsReady] = React.useState(false);

  // Track last-used brief, imageUrl, and analysis for refresh detection
  const [lastBrief, setLastBrief] = React.useState<BriefType | undefined>(undefined);
  const [lastImageUrl, setLastImageUrl] = React.useState<string>("");
  const [lastAnalysis, setLastAnalysis] = React.useState<ImageAnalysis | null>(null);

  // Generate prompts only when user clicks button
  const handleGeneratePrompts = () => {
    if (!brief || !imageUrl) return;
    setPrompts(buildScenesWithAnalysis(brief, imageUrl, analysis));
    setPromptsReady(true);
    setLastBrief(brief);
    setLastImageUrl(imageUrl);
    setLastAnalysis(analysis);
  };

  // If brief or analysis changes after prompts are generated, show refresh button
  const needsRefresh =
    promptsReady &&
    (JSON.stringify(brief) !== JSON.stringify(lastBrief) ||
      imageUrl !== lastImageUrl ||
      JSON.stringify(analysis) !== JSON.stringify(lastAnalysis));

  function buildScenesWithAnalysis(
    brief: BriefType,
    directImageUrl: string,
    analysis: ImageAnalysis | null
  ): SceneOutput[] {
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

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto py-8 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold">UGC Studio</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Instantly generate and stitch UGC-style ad scenes into a final reel.
          </p>
        </header>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <ImageReferenceWithAnalysis
              imageUrl={imageUrl}
              analysis={analysis}
              onAnalysis={setAnalysis}
            />
            <CreativeBrief
              onBriefChange={(b) => setBrief(b)}
              onImageUrlChange={setImageUrl}
            />
            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={handleGeneratePrompts}
                disabled={!brief || !imageUrl}
                className="w-full"
              >
                Generate Prompts
              </Button>
              {needsRefresh && (
                <Button
                  variant="secondary"
                  onClick={handleGeneratePrompts}
                  className="w-full"
                >
                  Refresh Prompts
                </Button>
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {promptsReady && prompts && (
              <PromptPreview
                brief={brief}
                scenes={prompts}
                directImageUrl={imageUrl}
                analysis={analysis}
              />
            )}
            <BatchBar onStitch={() => setStitchOpen(true)} />
            <div className="grid gap-4">
              {scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
            <OutputsPanel />
          </div>
        </div>
        <StitchModal open={stitchOpen} onClose={() => setStitchOpen(false)} />
      </div>
    </div>
  );
};

export default UgcStudio;