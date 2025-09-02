/**
 * FILMMAKING PROMPT ASSISTANT RULES
 * 
 * 🎬 Workflow Rules
 * 1. Input Options: Accepts scene description, script excerpt, or image.
 * 2. Gathers details for:
 *    - shot (composition, lens, camera motion)
 *    - subject (description, wardrobe)
 *    - scene (location, time of day, environment)
 *    - visual_details (action, props)
 *    - cinematography (lighting, tone)
 *    - audio (ambient + dialogue: character, voice, style, duration, emphasis)
 *    - color_palette
 *    - settings (transitions, e.g., cuts/dissolves)
 *    - action_sequence (time-based breakdown of key events)
 * 3. Latent Transport Option: If enabled, adds a line for Veo's latent transport.
 * 4. Output Format: Defaults to JSON.
 * 5. Content Guidelines:
 *    - No extra info (resolution, frame size, duration, looping) unless crucial.
 *    - Only mention film grain if stylistically relevant.
 *    - No reproduction of copyrighted/IP content.
 * 
 * ⚡ Acts as a cinematographer’s assistant + JSON prompt builder for Veo 3.
 */

import type { CreativeBrief, SceneOutput } from "@/types/ugc";

export type VeoPrompt = {
  shot: string;
  subject: string;
  scene: string;
  visual_details: string;
  cinematography: string;
  audio: string;
  color_palette: string;
  settings: string;
  action_sequence: string;
  latent_transport?: string;
  // Legacy/compat fields for backward compatibility:
  description?: string;
  style?: string;
  camera?: string;
  lighting?: string;
  elements?: string[];
  motion?: string;
  ending?: string;
  text?: string;
  keywords?: string[];
};

type Analysis = {
  brand_name?: string | null;
  color_scheme?: string[] | null;
  font_style?: string | null;
  visual_description?: string | null;
};

export function buildVeoPrompt(
  brief: CreativeBrief,
  scene: SceneOutput,
  analysis?: Analysis | null,
  latentTransport?: boolean
): VeoPrompt {
  // Compose details from brief, scene, and analysis
  const brand = analysis?.brand_name || "the product";
  const colors = (analysis?.color_scheme || []).join(", ");
  const font = analysis?.font_style || "";
  const visualDesc = analysis?.visual_description || "";
  const imageMention = scene.imagePrompt?.includes("Reference image:") ? "" : `Reference image: ${scene.id}`;
  const analysisMention = `Description: ${visualDesc}${brand ? `; Brand: ${brand}` : ""}${colors ? `; Colors: ${colors}` : ""}${font ? `; Font: ${font}` : ""}`;

  // Example breakdowns (these can be further customized per your workflow/UI)
  const shot = `Composition: ${scene.imagePrompt || "Medium shot"}, Camera: handheld, Lens: 35mm, Motion: slow pan`;
  const subject = `A ${brand} in focus, wardrobe: casual, authentic`;
  const sceneField = `Location: home interior, Time: day, Environment: natural light`;
  const visual_details = `Action: influencer speaks to camera, Props: product in hand`;
  const cinematography = `Lighting: soft, natural; Tone: authentic, relatable`;
  const audio = `Ambient: room tone, Dialogue: ${scene.videoPrompt || "casual testimonial"}, Voice: natural, Duration: ~10s, Emphasis: product experience`;
  const color_palette = colors || "neutral, natural";
  const settings = `Transitions: straight cut${font ? `, Font: ${font}` : ""}`;
  const action_sequence = `1. Establish product in hand\n2. Influencer delivers testimonial\n3. End with product close-up`;

  // Latent transport option
  const latent_transport = latentTransport
    ? "Instantly jump/cut on frame 1. [Describe the new context here for Veo's latent transport technique.]"
    : undefined;

  // Content guidelines: No extra info, no film grain unless relevant, no IP content.

  // Legacy/compat fields for backward compatibility
  return {
    shot,
    subject,
    scene: sceneField,
    visual_details,
    cinematography,
    audio,
    color_palette,
    settings,
    action_sequence,
    ...(latent_transport ? { latent_transport } : {}),
    // Legacy/compat fields:
    description: scene.imagePrompt,
    style: [
      "photorealistic cinematic",
      "fast render",
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
    motion: scene.videoPrompt,
    ending: "Product is beautifully presented, scene fades out.",
    text: "none",
    keywords: [
      brief.aspectRatio,
      brand,
      ...(colors ? colors.split(",") : []),
      "cinematic",
      "ugc",
      "veo3_fast",
    ].map((k) => k.trim()).filter(Boolean),
  };
}