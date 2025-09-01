import * as React from "react";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

const BatchBar = ({ onStitch }: { onStitch?: () => void }) => {
  const scenes = useUgcStore((s) => s.scenes);
  const sceneStatus = useUgcStore((s) => s.sceneStatus);
  const costs = useUgcStore((s) => s.costs);

  const allReady =
    scenes.length > 0 &&
    scenes.every((scene) => sceneStatus?.[scene.id] === "ready");

  return (
    <div className="flex items-center gap-4 p-3 bg-secondary rounded shadow">
      <button
        className="btn btn-primary"
        disabled={!allReady}
        title={allReady ? "" : "All scenes must be ready"}
      >
        Download All (ZIP)
      </button>
      <button
        className="btn btn-primary"
        disabled={!allReady}
        title={allReady ? "" : "All scenes must be ready"}
        onClick={allReady && onStitch ? onStitch : undefined}
      >
        Stitch Final Reel
      </button>
      <span className="ml-auto text-sm text-muted-foreground">
        Total: ${((costs?.total ?? 0) / 100).toFixed(2)}
      </span>
    </div>
  );
};

export default BatchBar;