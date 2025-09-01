import { create } from "zustand";
import type { Scene, SceneVersion, CostBreakdown, JobStatus } from "@/lib/types/ugc";

type UgcState = {
  scenes: Scene[];
  versions: Record<string, SceneVersion[]>;
  selectedVersionIds: Record<string, string>;
  costs: CostBreakdown;
  jobs: Record<string, JobStatus>;
  // Add more as needed
};

export const useUgcStore = create<UgcState>(() => ({
  scenes: [],
  versions: {},
  selectedVersionIds: {},
  costs: { perScene: {}, reGen: {}, stitch: 0, total: 0 },
  jobs: {},
}));