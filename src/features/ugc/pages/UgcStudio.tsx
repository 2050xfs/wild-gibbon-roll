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
import { showError, showSuccess } from "@/utils/toast";
import { useAutofillFromImage } from "../hooks/useAutofillFromImage";
import AutofillReviewCard from "@/features/ugc/components/AutofillReviewCard";

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
  const [brief, setBrief] = React.useState<any | undefined>(undefined);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [analysis, setAnalysis] = React.useState<ImageAnalysis | null>(null);
  const [prompts, setPrompts] = React.useState<any[] | undefined>(undefined);
  const [promptsReady, setPromptsReady] = React.useState(false);
  const [templateVersion, setTemplateVersion] = React.useState<string | undefined>(undefined);
  const [promptFingerprint, setPromptFingerprint] = React.useState<string | undefined>(undefined);

  // Autofill hook
  const {
    loading: autofillLoading,
    error: autofillError,
    creativeBrief,
    scenes: autofillScenes,
    confidence,
    warnings,
    autofill,
  } = useAutofillFromImage();

  // When imageUrl changes, trigger autofill
  React.useEffect(() => {
    if (imageUrl && /^https?:\/\//.test(imageUrl)) {
      autofill({
        imageUrl,
        scriptMode: "ai",
      });
    }
    // eslint-disable-next-line
  }, [imageUrl]);

  // Accept autofill: set brief and scenes for editing/generation
  const handleAcceptAutofill = async (editedBrief: any, editedScenes: any[]) => {
    setBrief(editedBrief);
    setPrompts(editedScenes);
    setPromptsReady(true);

    // Save prompt JSON/fingerprint/version in DB (example: save to scene_versions)
    try {
      const res = await fetch("/functions/v1/veo-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editedBrief,
          scenes: editedScenes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save prompt JSON");
      const data = await res.json();
      setTemplateVersion(data.templateVersion);
      setPromptFingerprint(data.promptId);
      showSuccess("Prompt JSON saved!");
    } catch (e: any) {
      showError(e?.message || "Failed to save prompt JSON");
    }
  };

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
            {/* Autofill review card */}
            {autofillLoading && (
              <div className="p-4 bg-muted rounded text-blue-600">Analyzing image and autofilling brief…</div>
            )}
            {autofillError && (
              <div className="p-4 bg-muted rounded text-destructive">Autofill failed: {autofillError}</div>
            )}
            {creativeBrief && autofillScenes && !promptsReady && (
              <AutofillReviewCard
                creativeBrief={creativeBrief}
                scenes={autofillScenes}
                confidence={confidence}
                warnings={warnings}
                onAccept={handleAcceptAutofill}
              />
            )}
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