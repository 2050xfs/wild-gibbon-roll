import * as React from "react";
import { useUgcStore } from "@/features/ugc/state/ugcStore";
import { ingestSources } from "@/lib/api/client";

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
  // For demo, assume each scene has a selectedVersion with a rendition_url or source_url
  const selectedVersions = scenes.map((scene) => ({
    ...scene,
    rendition_url: (scene as any).rendition_url,
    source_url: (scene as any).source_url,
    selected: true,
  }));

  const [order, setOrder] = React.useState<string[]>(
    selectedVersions.map((s) => s.id)
  );
  const [transition, setTransition] = React.useState("none");
  const [endCard, setEndCard] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const stitchJob = useUgcStore((s) => s.stitchJob);
  const startStitch = useUgcStore((s) => s.startStitch);
  const clearStitch = useUgcStore((s) => s.clearStitch);

  React.useEffect(() => {
    setOrder(selectedVersions.map((s) => s.id));
  }, [open, selectedVersions.length]);

  React.useEffect(() => {
    if (!open) clearStitch?.();
    // eslint-disable-next-line
  }, [open]);

  const handleStitch = async () => {
    setSubmitting(true);
    const sceneUrls = order.map((id) => {
      const v = selectedVersions.find((s) => s.id === id);
      return v?.rendition_url || v?.source_url || "";
    });
    try {
      const ingestRes = await ingestSources(sceneUrls);
      const ingestedUrls = ingestRes.sources.map((s: any) => s.response?.url || s.url || s.source?.url || "");
      await startStitch?.({
        sceneUrls: ingestedUrls.every(Boolean) ? ingestedUrls : sceneUrls,
        order,
        transition,
        aspect: "9:16",
        endCard: endCard.trim() || undefined,
      });
    } catch (e) {
      await startStitch?.({
        sceneUrls,
        order,
        transition,
        aspect: "9:16",
        endCard: endCard.trim() || undefined,
      });
    }
    setSubmitting(false);
  };

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
              const scene = selectedVersions.find((s) => s.id === sceneId);
              return (
                <li
                  key={sceneId}
                  className="flex items-center gap-2 bg-muted rounded px-2 py-1"
                >
                  <span className="font-semibold">Scene {scene?.index! + 1}</span>
                  <span className="text-xs text-muted-foreground flex-1">
                    {scene?.prompt}
                  </span>
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
        {stitchJob && (
          <div className="mb-4">
            <div className="text-sm">
              Status: <span className="font-semibold">{stitchJob.status}</span>
              {stitchJob.status === "failed" && (
                <span className="text-red-600 ml-2">{stitchJob.error}</span>
              )}
            </div>
            {stitchJob.status === "done" && (
              <div className="mt-2">
                <a
                  href={stitchJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Download Final Reel
                </a>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-muted"
            onClick={onClose}
            type="button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold"
            onClick={handleStitch}
            disabled={submitting || (stitchJob && stitchJob.status === "done")}
            type="button"
          >
            {submitting ? "Stitching..." : "Stitch"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StitchModal;