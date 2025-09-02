export type Aspect = "9:16" | "16:9" | "1:1";

export type VeoJSONPrompt = {
  description: string;
  style?: string;
  camera?: string;
  lighting?: string;
  room?: string;
  environment?: string;
  elements?: string[];
  motion?: string;
  ending?: string;
  text?: string;
  keywords?: string[];
  sequence?: Array<Record<string, string>>;
  audio?: Record<string, string>;
  metadata?: Record<string, string>;
};