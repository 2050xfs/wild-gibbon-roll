export type Scene = {
  id: string;
  index: number;
  prompt: string;
  // Add more as needed
};

export type SceneVersion = {
  versionId: string;
  status: "pending" | "processing" | "ready" | "error";
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
};

export type JobStatus = {
  jobId: string;
  status: "pending" | "processing" | "ready" | "error";
  progress?: number;
  assetUrl?: string;
  error?: string;
};

export type CostBreakdown = {
  perScene: { [sceneId: string]: number };
  reGen: { [sceneId: string]: { [versionId: string]: number } };
  stitch: number;
  total: number;
};