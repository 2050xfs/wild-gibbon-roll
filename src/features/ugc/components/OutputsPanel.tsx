import * as React from "react";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

const OutputsPanel = () => {
  const scenes = useUgcStore((s) => s.scenes);
  const sceneStatus = useUgcStore((s) => s.sceneStatus);

  const readyScenes = scenes.filter(
    (scene) => sceneStatus?.[scene.id] === "ready"
  );

  return (
    <div className="p-4 bg-card rounded shadow">
      <h2 className="font-semibold mb-2">Outputs</h2>
      {readyScenes.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          Generated clips and final reel will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {readyScenes.map((scene) => (
            <div
              key={scene.id}
              className="flex items-center gap-4 border rounded p-2"
            >
              <div className="w-32 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                {/* Placeholder for video preview */}
                Video Preview
              </div>
              <div className="flex-1">
                <div className="font-medium">Scene {scene.index + 1}</div>
                <div className="text-xs text-muted-foreground">
                  {scene.prompt}
                </div>
              </div>
              <button className="btn btn-primary" disabled>
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutputsPanel;