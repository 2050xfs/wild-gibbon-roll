import * as React from "react";
import { Button } from "@/components/ui/button";

type CreativeBrief = any;
type VeoScene = any;

type Props = {
  creativeBrief: CreativeBrief;
  scenes: VeoScene[];
  confidence?: any;
  warnings?: string[];
  onAccept: (brief: CreativeBrief, scenes: VeoScene[]) => void;
};

export default function AutofillReviewCard({
  creativeBrief,
  scenes,
  confidence,
  warnings,
  onAccept,
}: Props) {
  const [brief, setBrief] = React.useState({ ...creativeBrief });
  const [sceneEdits, setSceneEdits] = React.useState(scenes.map((s) => ({ ...s })));

  // Handlers for editing
  const handleBriefChange = (field: string, value: any) => {
    setBrief((prev) => ({ ...prev, [field]: value }));
  };
  const handleSceneChange = (idx: number, field: string, value: any) => {
    setSceneEdits((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="p-4 bg-card rounded shadow space-y-2">
      <div className="font-semibold">AI-Suggested Creative Brief (Editable)</div>
      <div className="text-xs text-muted-foreground">
        Product:{" "}
        <input
          className="border rounded px-1 py-0.5 text-xs"
          value={brief.product?.brand || ""}
          onChange={(e) =>
            handleBriefChange("product", {
              ...brief.product,
              brand: e.target.value,
            })
          }
          style={{ width: 80 }}
        />{" "}
        <input
          className="border rounded px-1 py-0.5 text-xs"
          value={brief.product?.name || ""}
          onChange={(e) =>
            handleBriefChange("product", {
              ...brief.product,
              name: e.target.value,
            })
          }
          style={{ width: 80 }}
        />{" "}
        ({brief.product?.category})
      </div>
      <div className="flex flex-wrap gap-2 my-1">
        Palette: {(brief.palette || []).map((c: string, i: number) => (
          <input
            key={i}
            className="inline-block w-12 h-5 rounded border text-xs px-1"
            value={c}
            onChange={(e) => {
              const newPalette = [...brief.palette];
              newPalette[i] = e.target.value;
              handleBriefChange("palette", newPalette);
            }}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        Environment:{" "}
        <input
          className="border rounded px-1 py-0.5 text-xs"
          value={sceneEdits[0]?.environment || ""}
          onChange={(e) => handleSceneChange(0, "environment", e.target.value)}
          style={{ width: 100 }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Confidence:{" "}
        {confidence
          ? Object.entries(confidence)
              .map(([k, v]) => `${k}: ${(v as number * 100).toFixed(0)}%`)
              .join(", ")
          : "N/A"}
      </div>
      {warnings && warnings.length > 0 && (
        <div className="text-xs text-yellow-700">
          Warnings: {warnings.join("; ")}
        </div>
      )}
      <div className="mt-2 space-y-2">
        {sceneEdits.map((scene, idx) => (
          <div
            key={idx}
            className="border rounded p-2 bg-muted/50 space-y-1"
          >
            <div className="font-medium text-xs mb-1">
              Scene {idx + 1}{" "}
              <span className="text-muted-foreground">
                ({scene.description?.slice(0, 40)}…)
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs">
                Description:
                <textarea
                  className="w-full border rounded px-1 py-0.5 text-xs"
                  value={scene.description}
                  onChange={(e) =>
                    handleSceneChange(idx, "description", e.target.value)
                  }
                  rows={2}
                />
              </label>
              <label className="text-xs">
                Motion:
                <input
                  className="w-full border rounded px-1 py-0.5 text-xs"
                  value={scene.motion || ""}
                  onChange={(e) =>
                    handleSceneChange(idx, "motion", e.target.value)
                  }
                />
              </label>
              <label className="text-xs">
                Ending:
                <input
                  className="w-full border rounded px-1 py-0.5 text-xs"
                  value={scene.ending || ""}
                  onChange={(e) =>
                    handleSceneChange(idx, "ending", e.target.value)
                  }
                />
              </label>
              {/* Advanced fields */}
              <label className="text-xs">
                Audio (JSON):
                <input
                  className="w-full border rounded px-1 py-0.5 text-xs"
                  value={scene.audio ? JSON.stringify(scene.audio) : ""}
                  onChange={(e) =>
                    handleSceneChange(
                      idx,
                      "audio",
                      e.target.value ? JSON.parse(e.target.value) : undefined
                    )
                  }
                />
              </label>
              <label className="text-xs">
                Metadata (JSON):
                <input
                  className="w-full border rounded px-1 py-0.5 text-xs"
                  value={scene.metadata ? JSON.stringify(scene.metadata) : ""}
                  onChange={(e) =>
                    handleSceneChange(
                      idx,
                      "metadata",
                      e.target.value ? JSON.parse(e.target.value) : undefined
                    )
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Button
          onClick={() => onAccept(brief, sceneEdits)}
          className="w-full"
        >
          Accept &amp; Generate
        </Button>
      </div>
    </div>
  );
}