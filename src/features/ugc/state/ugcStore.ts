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

type UgcState = {
  scenes: Scene[];
  versions: Record<string, SceneVersion[]>;
  selectedVersionIds: Record<string, string>;
  costs: CostBreakdown;
  jobs: Record<string, JobStatus>;
  imageUrl?: string;
  brief?: UgcBrief;
  setImage?: (url?: string) => void;
  setBrief?: (brief: UgcBrief) => void;
  // Add more as needed
};

export const useUgcStore = create<UgcState>((set) => ({
  scenes: [],
  versions: {},
  selectedVersionIds: {},
  costs: { perScene: {}, reGen: {}, stitch: 0, total: 0 },
  jobs: {},
  imageUrl: undefined,
  brief: undefined,
  setImage: (url) => set({ imageUrl: url }),
  setBrief: (brief) => set({ brief }),
}));