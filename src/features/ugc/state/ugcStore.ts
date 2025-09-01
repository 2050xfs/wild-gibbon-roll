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
    // Simulate async generation
    set((state) => ({
      sceneStatus: { ...state.sceneStatus, [sceneId]: "pending" },
    }));
    setTimeout(() => {
      // Randomly succeed or fail for demo
      const success = Math.random() > 0.15;
      set((state) => ({
        sceneStatus: {
          ...state.sceneStatus,
          [sceneId]: success ? "ready" : "error",
        },
      }));
    }, 1500 + Math.random() * 1200);
  },
}));