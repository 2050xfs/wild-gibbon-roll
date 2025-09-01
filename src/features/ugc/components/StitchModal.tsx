import * as React from "react";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

const transitions = [
  { value: "none", label: "None" },
  { value: "cut", label: "Cut" },
  { value: "crossfade", label: "200ms Crossfade" },
];

const StitchModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const scenes = useUgcStore((s) => s.scenes);
  const sceneStatus = useUgcStore((s) => s.sceneStatus);

  const readyScenes = scenes.filter(
    (scene) => sceneStatus?.[scene.id] === "ready"
  );

  const [order, setOrder] = React.useState<string[]>(
    readyScenes.map((s) => s.id)
  );
  const [transition, setTransition] = React.useState("none");
  const [endCard, setEndCard] = React.useState("");
  // Drag-and-drop not implemented yet; just a static list for now

  React.useEffect(() => {
    setOrder(readyScenes.map((s) => s.id));
  }, [open, readyScenes.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-card rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Stitch Final Reel</h2>
        <div className="mb-4">
          <div className="font-medium mb-2">Order Scenes</div>
          <ol className="space-y-1">
            {order.map((sceneId, idx) => {
              const scene = readyScenes.find((s) => s.id === sceneId);
              return (
                <li
                  key={sceneId}
                  className="flex items-center gap-2 bg-muted rounded px-2 py-1"
                >
                  <span className="font-semibold">Scene {scene?.index! + 1}</span>
                  <span className="text-xs text-muted-foreground flex-1">
                    {scene?.prompt}
                  </span>
                  {/* Drag handles would go here */}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Transition</label>
          <select
            className="w-full border rounded p-2"
            value={transition}
            onChange={(e) => setTransition(e.target.value)}
          >
            {transitions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">End Card (optional)</label>
          <input
            className="w-full border rounded p-2"
            placeholder="Text or upload (not implemented)"
            value={endCard}
            onChange={(e) => setEndCard(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-muted"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold"
            disabled
            type="button"
          >
            Stitch (not implemented)
          </button>
        </div>
      </div>
    </div>
  );
};

export default StitchModal;