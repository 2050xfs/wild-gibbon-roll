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
import { showError } from "@/utils/toast";

type ImageAnalysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

type VeoBuildResponse = {
  templateVersion: string;
  promptId: string;
  scenes: any[];
};

const UgcStudio = () => {
  const { scenes } = useUgcStore();
  const [stitchOpen, setStitchOpen] = React.useState(false);

  // Local state for brief, image, analysis, and prompts
  const [brief, setBrief] = React.useState<BriefType | undefined>(undefined);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [prompts, setPrompts] = React.useState<any[] | undefined>(undefined);
  const [promptsReady, setPromptsReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [templateVersion, setTemplateVersion] = React.useState<string | undefined>(undefined);
  const [promptFingerprint, setPromptFingerprint] = React.useState<string | undefined>(undefined);

  // Track last-used brief, imageUrl, and analysis for refresh detection
  const [lastBrief, setLastBrief] = React.useState<BriefType | undefined>(undefined);
  const [lastImageUrl, setLastImageUrl] = React.useState<string>("");
  const [lastAnalysis, setLastAnalysis] = React.useState<ImageAnalysis | null>(null);

  // Generate prompts only when user clicks button
  const handleGeneratePrompts = async () => {
    if (!brief || !imageUrl) return;
    setLoading(true);
    try {
      // Compose payload for Edge Function
      const payload: any = {
        numScenes: brief.numberOfVideos,
        aspect: (() => {
          switch (brief.aspectRatio) {
            case "vertical_9_16": return "9:16";
            case "portrait_3_4": return "3:4";
            case "landscape_16_9": return "16:9";
            default: return "9:16";
          }
        })(),
        themeHint: "", // You can wire this to a field if you want
        productImageUrl: imageUrl,
        influencer: {
          appearance: brief.influencerDescription,
        },
        scriptMode: brief.dialogueMode === "provide" ? "manual" : "ai",
        scriptText: brief.scriptText,
      };
      const res = await fetch("/functions/v1/veo-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to generate prompts");
      }
      const data: VeoBuildResponse = await res.json();
      setPrompts(data.scenes);
      setPromptsReady(true);
      setTemplateVersion(data.templateVersion);
      setPromptFingerprint(data.promptId);
      setLastBrief(brief);
      setLastImageUrl(imageUrl);
      setLastAnalysis(analysis);
    } catch (e: any) {
      showError(e?.message || "Failed to generate prompts");
    } finally {
      setLoading(false);
    }
  };

  // If brief or analysis changes after prompts are generated, show refresh button
  const needsRefresh =
    promptsReady &&
    (JSON.stringify(brief) !== JSON.stringify(lastBrief) ||
      imageUrl !== lastImageUrl ||
      JSON.stringify(analysis) !== JSON.stringify(lastAnalysis));

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
                disabled={!brief || !imageUrl || loading}
                className="w-full"
              >
                {loading ? "Generating..." : "Generate Prompts"}
              </Button>
              {needsRefresh && (
                <Button
                  variant="secondary"
                  onClick={handleGeneratePrompts}
                  className="w-full"
                  disabled={loading}
                >
                  Refresh Prompts
                </Button>
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {promptsReady && prompts && (
              <div>
                <div className="mb-2 text-xs text-muted-foreground">
                  <span>Template version: {templateVersion}</span>
                  <span className="ml-4">Prompt fingerprint: {promptFingerprint}</span>
                </div>
                <PromptPreview
                  brief={brief}
                  scenes={prompts}
                  directImageUrl={imageUrl}
                  analysis={analysis}
                />
              </div>
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