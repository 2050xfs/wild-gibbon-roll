import * as React from "react";
import type { Scene } from "@/lib/types/ugc";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

type Props = { scene: Scene };

const statusColors: Record<string, string> = {
  idle: "bg-gray-200 text-gray-700",
  pending: "bg-yellow-200 text-yellow-800",
  ready: "bg-green-200 text-green-800",
  error: "bg-red-200 text-red-800",
};

const statusLabels: Record<string, string> = {
  idle: "Idle",
  pending: "Pending…",
  ready: "Ready",
  error: "Error",
};

const SceneCard = ({ scene }: Props) => {
  const sceneStatus = useUgcStore((s) => s.sceneStatus?.[scene.id] || "idle");
  const sendPrompt = useUgcStore((s) => s.sendPrompt);

  return (
    <div className="p-4 bg-card rounded shadow flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Scene {scene.index + 1}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[sceneStatus]}`}>
          {statusLabels[sceneStatus]}
        </span>
      </div>
      <div className="text-muted-foreground text-sm mb-2">{scene.prompt}</div>
      {sceneStatus === "idle" && (
        <button
          className="px-3 py-1 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition w-fit"
          onClick={() => sendPrompt?.(scene.id)}
        >
          Send Prompt
        </button>
      )}
      {sceneStatus === "error" && (
        <div className="text-xs text-red-600">Generation failed. Try again.</div>
      )}
    </div>
  );
};

export default SceneCard;