import type { Aspect, VeoJSONPrompt } from "./promptTypes";

type BuildArgs = {
  productImageUrl?: string;
  numScenes: number;
  aspect: Aspect;
  themeHint?: string;
  influencer?: {
    appearance?: string;
    ageRange?: string;
    genders?: string;
    specialScenes?: string;
  };
  scriptMode: "manual" | "ai";
  scriptText?: string;
};

const BASE_KEYWORDS_BY_ASPECT: Record<Aspect, string[]> = {
  "9:16": ["9:16", "mobile", "vertical"],
  "16:9": ["16:9", "cinematic"],
  "1:1":  ["1:1", "square"],
};

export function buildVeoJSONScenes(args: BuildArgs): VeoJSONPrompt[] {
  const { numScenes, aspect, themeHint, influencer, scriptMode, scriptText } = args;

  const talentLine = [
    influencer?.appearance && `Appearance: ${influencer.appearance}`,
    influencer?.ageRange && `Age Range: ${influencer.ageRange}`,
    influencer?.genders && `Genders: ${influencer.genders}`,
    influencer?.specialScenes && `Requested scenes: ${influencer.specialScenes}`
  ].filter(Boolean).join(" · ");

  const baseKeywords = BASE_KEYWORDS_BY_ASPECT[aspect];
  const commonKeywords = [
    ...baseKeywords,
    "ugc", "handheld", "natural light", "no text"
  ];

  return Array.from({ length: Math.max(1, numScenes) }, (_, i) => {
    const n = i + 1;

    const p: VeoJSONPrompt = {
      description:
        `Selfie/handheld UGC clip #${n} from ONE continuous story. ` +
        (themeHint ? `Theme: ${themeHint}. ` : "") +
        (args.productImageUrl ? `Include product as visual anchor: ${args.productImageUrl}. ` : ""),
      style: "photorealistic cinematic, authentic social video",
      camera: "handheld portrait framing, eye-level, minimal shake",
      lighting: "natural, soft key; keep consistent across scenes",
      environment: "realistic everyday setting aligned with story",
      elements: [
        "product in frame",
        "actor present",
        "props that reinforce the story"
      ],
      motion: "clear primary action with natural pacing; keep continuity of wardrobe/background",
      ending: "hold on product or satisfied reaction beat",
      text: "none",
      keywords: commonKeywords
    };

    if (scriptMode === "manual" && scriptText?.trim()) {
      p.sequence = [{ SCRIPT: scriptText.trim() }];
    }

    if (talentLine) p.description += ` Talent: ${talentLine}.`;

    return p;
  });
}