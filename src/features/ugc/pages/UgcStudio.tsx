import * as React from "react";
import ImageReference from "@/features/ugc/components/ImageReference";
import CreativeBrief from "@/features/ugc/components/CreativeBrief";
import SceneCard from "@/features/ugc/components/SceneCard";
import BatchBar from "@/features/ugc/components/BatchBar";
import OutputsPanel from "@/features/ugc/components/OutputsPanel";
import StitchModal from "@/features/ugc/components/StitchModal";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

const UgcStudio = () => {
  const { scenes } = useUgcStore();

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
            <ImageReference />
            <CreativeBrief />
          </div>
          <div className="md:col-span-2 space-y-4">
            <BatchBar />
            <div className="grid gap-4">
              {scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
            <OutputsPanel />
          </div>
        </div>
        <StitchModal />
      </div>
    </div>
  );
};

export default UgcStudio;