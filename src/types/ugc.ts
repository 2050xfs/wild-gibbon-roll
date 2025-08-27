export type ModelChoice = "V3 Fast" | "V3 Quality";

export type AspectRatio =
  | "vertical_9_16"
  | "portrait_3_4"
  | "landscape_16_9";

export type DialogueMode = "provide" | "generate";

export interface CreativeBrief {
  referenceImageUrl: string;
  numberOfVideos: number;
  dialogueMode: DialogueMode;
  scriptText?: string;
  modelChoice: ModelChoice;
  aspectRatio: AspectRatio;
  influencerDescription?: string;
  specialRequests?: string;
}

export interface SceneOutput {
  id: string;
  imagePrompt: string;
  videoPrompt: string;
  videoAspectRatio: "9:16" | "3:4" | "16:9";
  imageAspectRatio: "9:16" | "3:4" | "16:9";
  model: ModelChoice;
}