import * as React from "react";
import type { Scene } from "@/lib/types/ugc";

type Props = { scene: Scene };

const SceneCard = ({ scene }: Props) => {
  // Placeholder: implement per-scene state machine, version tabs, actions
  return (
    <div className="p-4 bg-card rounded shadow">
      <h3 className="font-semibold mb-2">Scene {scene.index + 1}</h3>
      <div className="text-muted-foreground text-sm">Scene prompt and actions go here.</div>
    </div>
  );
};

export default SceneCard;