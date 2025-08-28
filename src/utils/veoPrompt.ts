import type { CreativeBrief, SceneOutput } from "@/types/ugc";

export type VeoPrompt = {
  description: string;
  style: string;
  camera: string;
  lighting: string;
  elements: string[];
  motion: string;
  ending: string;
  text: string;
  keywords: string[];
  // Optionally add advanced fields here
};

export function buildVeoPrompt(
  brief: CreativeBrief,
  scene: SceneOutput,
  analysis?: {
    brand_name?: string | null;
    color_scheme?: string[] | null;
    font_style?: string | null;
    visual_description?: string | null;
  } | null
): VeoPrompt {
  // Use analysis to enrich fields if available
  const brand = analysis?.brand_name || "the product";
  const colors = (analysis?.color_scheme || []).join(", ");
  const font = analysis?.font_style || "";
  const visualDesc = analysis?.visual_description || "";

  // Compose fields
  return {
    description:
      scene.imagePrompt ||
      `A cinematic shot of ${brand}. ${visualDesc}`,
    style: [
      "photorealistic cinematic",
      brief.modelChoice === "V3 Quality" ? "high detail" : "fast render",
      font ? `font: ${font}` : "",
      colors ? `color scheme: ${colors}` : "",
    ]
      .filter(Boolean)
      .join(", "),
    camera: "slow orbital shot, then overhead reveal",
    lighting: "natural light, soft highlights",
    elements: [
      brand,
      ...(colors ? [`color palette: ${colors}`] : []),
      ...(font ? [`font style: ${font}`] : []),
      ...(scene.imagePrompt ? [scene.imagePrompt] : []),
    ],
    motion: scene.videoPrompt || "Product is shown in dynamic, engaging motion.",
    ending: "Product is beautifully presented, scene fades out.",
    text: "none",
    keywords: [
      brief.aspectRatio,
      brand,
      ...(colors ? colors.split(",") : []),
      "cinematic",
      "ugc",
      "veo3",
    ].map((k) => k.trim()).filter(Boolean),
  };
}