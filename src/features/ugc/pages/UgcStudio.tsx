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
import { showError } from "@/utils/toast";
import { useAutofillFromImage } from "../hooks/useAutofillFromImage";

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
  const [loading, setLoading] = React.useState(false);

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
  const handleAcceptAutofill = () => {
    if (creativeBrief && autofillScenes) {
      setBrief(creativeBrief);
      setPrompts(autofillScenes);
      setPromptsReady(true);
    }
  };

  // If brief or analysis changes after prompts are generated, show refresh button
  const needsRefresh = false; // For now, since autofill is always fresh

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
            {creativeBrief && autofillScenes && (
              <div className="p-4 bg-card rounded shadow space-y-2">
                <div className="font-semibold">AI-Suggested Creative Brief</div>
                <div className="text-xs text-muted-foreground">
                  Product: {creativeBrief.product?.brand} {creativeBrief.product?.name} ({creativeBrief.product?.category})
                </div>
                <div className="flex flex-wrap gap-2 my-1">
                  Palette: {(creativeBrief.palette || []).map((c: string) => (
                    <span key={c} className="inline-block w-5 h-5 rounded border" style={{ background: c }} title={c}></span>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Environment: {autofillScenes[0]?.environment}
                </div>
                <div className="text-xs text-muted-foreground">
                  Confidence: {confidence ? Object.entries(confidence).map(([k, v]) => `${k}: ${(v as number * 100).toFixed(0)}%`).join(", ") : "N/A"}
                </div>
                {warnings && warnings.length > 0 && (
                  <div className="text-xs text-yellow-700">Warnings: {warnings.join("; ")}</div>
                )}
                <div className="mt-2">
                  <Button onClick={handleAcceptAutofill} className="w-full">Accept &amp; Review Scenes</Button>
                </div>
              </div>
            )}
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