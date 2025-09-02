import { create } from "zustand";
import type { Scene, SceneVersion, CostBreakdown, JobStatus } from "@/lib/types/ugc";

type UgcBrief = {
  numVideos: number;
  scriptMode: "manual" | "ai";
  scriptText: string;
  influencer: string;
  aspect: string;
  model: string;
};

type SceneStatus = "idle" | "pending" | "ready" | "error";

type StitchJob = {
  renderId: string;
  status: "queued" | "rendering" | "done" | "failed";
  url?: string;
  error?: string;
};

type UgcState = {
  scenes: Scene[];
  sceneStatus: Record<string, SceneStatus>;
  versions: Record<string, SceneVersion[]>;
  selectedVersionIds: Record<string, string>;
  costs: CostBreakdown;
  jobs: Record<string, JobStatus>;
  imageUrl?: string;
  brief?: UgcBrief;
  setImage?: (url?: string) => void;
  setBrief?: (brief: UgcBrief) => void;
  generateScenes?: () => void;
  sendPrompt?: (sceneId: string) => void;
  // Stitching
  stitchJob?: StitchJob;
  startStitch?: (params: {
    sceneUrls: string[];
    order: string[];
    transition: string;
    aspect: string;
    endCard?: string;
  }) => Promise<void>;
  pollStitch?: () => Promise<void>;
  clearStitch?: () => void;
};

export const useUgcStore = create<UgcState>((set, get) => ({
  scenes: [],
  sceneStatus: {},
  versions: {},
  selectedVersionIds: {},
  costs: { perScene: {}, reGen: {}, stitch: 0, total: 0 },
  jobs: {},
  imageUrl: undefined,
  brief: undefined,
  setImage: (url) => set({ imageUrl: url }),
  setBrief: (brief) => {
    set({ brief });
    get().generateScenes?.();
  },
  generateScenes: () => {
    const brief = get().brief;
    if (!brief) return;
    const scenes: Scene[] = [];
    for (let i = 0; i < brief.numVideos; i++) {
      scenes.push({
        id: `scene-${i + 1}`,
        index: i,
        prompt: `Scene ${i + 1} prompt goes here.`,
      });
    }
    // Reset scene status to idle
    const sceneStatus: Record<string, SceneStatus> = {};
    scenes.forEach((s) => (sceneStatus[s.id] = "idle"));
    set({ scenes, sceneStatus });
  },
  sendPrompt: (sceneId) => {
    set((state) => ({
      sceneStatus: { ...state.sceneStatus, [sceneId]: "pending" },
    }));
    setTimeout(() => {
      const success = Math.random() > 0.15;
      set((state) => ({
        sceneStatus: {
          ...state.sceneStatus,
          [sceneId]: success ? "ready" : "error",
        },
      }));
    }, 1500 + Math.random() * 1200);
  },
  // Stitching
  stitchJob: undefined,
  startStitch: async ({ sceneUrls, order, transition, aspect, endCard }) => {
    set({ stitchJob: undefined });
    const res = await fetch("/reels-stitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneUrls,
        order,
        transition,
        aspect,
        endCard,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.renderId) {
      set({
        stitchJob: {
          renderId: "",
          status: "failed",
          error: data?.error || "Failed to start stitching",
        },
      });
      return;
    }
    set({
      stitchJob: {
        renderId: data.renderId,
        status: data.status || "queued",
      },
    });
    // Start polling
    get().pollStitch?.();
  },
  pollStitch: async () => {
    const job = get().stitchJob;
    if (!job?.renderId) return;
    let done = false;
    let tries = 0;
    while (!done && tries < 60) {
      tries++;
      const res = await fetch(`/reels-stitch?id=${job.renderId}`);
      const data = await res.json();
      if (!res.ok) {
        set((state) => ({
          stitchJob: {
            ...state.stitchJob!,
            status: "failed",
            error: data?.error || "Polling failed",
          },
        }));
        return;
      }
      if (data.status === "done" && data.url) {
        set((state) => ({
          stitchJob: {
            ...state.stitchJob!,
            status: "done",
            url: data.url,
          },
        }));
        done = true;
        return;
      }
      if (data.status === "failed") {
        set((state) => ({
          stitchJob: {
            ...state.stitchJob!,
            status: "failed",
            error: data?.error || "Stitching failed",
          },
        }));
        done = true;
        return;
      }
      set((state) => ({
        stitchJob: {
          ...state.stitchJob!,
          status: data.status,
        },
      }));
      await new Promise((r) => setTimeout(r, 4000));
    }
    if (!done) {
      set((state) => ({
        stitchJob: {
          ...state.stitchJob!,
          status: "failed",
          error: "Timed out waiting for stitching",
        },
      }));
    }
  },
  clearStitch: () => set({ stitchJob: undefined }),
}));