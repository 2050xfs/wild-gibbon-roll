import * as React from "react";
import type { Scene } from "@/lib/types/ugc";
import { useUgcStore } from "@/features/ugc/state/ugcStore";
import { selectSceneVersion, getSceneVersions, createSceneVersion } from "@/lib/api/client";
import { useSceneVersionsSubscription } from "@/features/ugc/hooks/useSceneVersionsSubscription";

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

  const [versions, setVersions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const fetchVersions = React.useCallback(async () => {
    setLoading(true);
    const data = await getSceneVersions(scene.id);
    setVersions(data);
    setLoading(false);
  }, [scene.id]);

  React.useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Real-time updates
  useSceneVersionsSubscription([scene.id], () => {
    fetchVersions();
  });

  const handleSelect = async (versionId: string) => {
    await selectSceneVersion(versionId);
    fetchVersions();
  };

  // New: handle send prompt and create version
  const handleSendPrompt = async () => {
    setSending(true);
    try {
      // 1. Start provider job (replace with your actual job start logic)
      // const providerJobId = await startProviderJob(scene.prompt);
      const providerJobId = "mock-job-id-" + Math.random().toString(36).slice(2, 8); // Replace with real job ID

      // 2. Create scene version in DB
      await createSceneVersion({
        scene_id: scene.id,
        provider_job_id: providerJobId,
      });

      // 3. Optionally, update local state/UI
      fetchVersions();
    } catch (e) {
      // Handle error (show toast, etc.)
    } finally {
      setSending(false);
    }
  };

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
          onClick={handleSendPrompt}
          disabled={sending}
        >
          {sending ? "Sending..." : "Send Prompt"}
        </button>
      )}
      {sceneStatus === "error" && (
        <div className="text-xs text-red-600">Generation failed. Try again.</div>
      )}
      {/* Version tabs */}
      <div className="flex gap-2 mt-2">
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading versions…</span>
        ) : versions.length === 0 ? (
          <span className="text-xs text-muted-foreground">No versions yet</span>
        ) : (
          versions.map((v, idx) => (
            <button
              key={v.id}
              className={`px-2 py-1 rounded text-xs font-medium border ${
                v.selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-muted"
              }`}
              onClick={() => handleSelect(v.id)}
              disabled={v.selected}
              title={v.status}
            >
              V{idx + 1} {v.selected && "✓"}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SceneCard;