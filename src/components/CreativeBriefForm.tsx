"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import type { AspectRatio, CreativeBrief, DialogueMode, ModelChoice, SceneOutput } from "../types/ugc";
import { cn } from "@/lib/utils";
import { Copy, Wand2 } from "lucide-react";
import { storeImageFromUrl } from "@/utils/storeImage";
import { buildVeoPrompt } from "@/utils/veoPrompt";

const defaultScenes = [
  "casual vlog selfie at home, natural light, minimal makeup",
  "in-car testimonial, dash-mounted phone, daylight reflections",
  "podcast-style medium shot at desk, soft lamp light, cozy background",
  "mirror selfie in bathroom, handheld angle, imperfect framing",
  "walking-and-talking outside, sidewalk background, ambient city sounds",
];

function ratioToLabel(r: AspectRatio): { video: "9:16" | "3:4" | "16:9"; image: "9:16" | "3:4" | "16:9"; human: string } {
  switch (r) {
    case "vertical_9_16":
      return { video: "9:16", image: "9:16", human: "Vertical (9:16)" };
    case "portrait_3_4":
      return { video: "3:4", image: "3:4", human: "Portrait (3:4)" };
    case "landscape_16_9":
      return { video: "16:9", image: "16:9", human: "Landscape (16:9)" };
  }
}

function sanitizeText(s?: string) {
  if (!s) return "";
  return s
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/—/g, " ")
    .replace(/–/g, "-")
    .trim();
}

function isHttpUrl(s?: string) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function buildScenes(brief: CreativeBrief) {
  const scenes: SceneOutput[] = [];
  const ratio = ratioToLabel(brief.aspectRatio);
  const model = brief.modelChoice;

  const sceneHints = (brief.specialRequests || "")
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = sceneHints.length > 0 ? sceneHints : defaultScenes;

  for (let i = 0; i < brief.numberOfVideos; i++) {
    const baseScene = pool[i % pool.length];

    const character = sanitizeText(brief.influencerDescription || "normal and casual looking person, authentic, relatable");
    const special = sanitizeText(brief.specialRequests);

    const script =
      brief.dialogueMode === "provide"
        ? sanitizeText(brief.scriptText || "")
        : `Hi… I’ve been trying this product for a week now… and honestly I love it… It’s simple… looks great… and does exactly what I need… You should definitely check it out…`;

    const imagePrompt = [
      `Unremarkable amateur iPhone photo… ${baseScene}…`,
      `Product from reference image is clearly visible…`,
      `Casual framing, slight motion blur acceptable, realistic lighting…`,
      `Character: ${character}…`,
      special ? `Details: ${special}…` : "",
      `No watermarks… realistic textures… no text overlays…`,
    ]
      .filter(Boolean)
      .join(" ");

    const videoPrompt = [
      `UGC style video… ${baseScene}…`,
      `Focus on product from reference image…`,
      `Casual, authentic tone… realistic audio ambience…`,
      `Dialogue: ${script}`,
      `Prompt rules: use ellipses for pauses… avoid hyphenation issues… no double quotes in content…`,
    ].join(" ");

    // Instead of returning plain prompts, return a JSON-style prompt
    scenes.push({
      id: `${i + 1}`,
      imagePrompt,
      videoPrompt,
      videoAspectRatio: ratio.video,
      imageAspectRatio: ratio.image,
      model,
      // Add a field for the Veo JSON prompt (for preview and sending)
      // analysis will be added later if available
    });
  }

  return scenes;
}

type Props = {
  onScenesReady?: (brief: CreativeBrief, scenes: SceneOutput[], directImageUrl?: string) => void;
};

export default function CreativeBriefForm({ onScenesReady }: Props) {
  const [referenceImageUrl, setReferenceImageUrl] = React.useState("");
  const [numberOfVideos, setNumberOfVideos] = React.useState(3);
  const [dialogueMode, setDialogueMode] = React.useState<DialogueMode>("generate");
  const [scriptText, setScriptText] = React.useState("");
  const [modelChoice, setModelChoice] = React.useState<ModelChoice>("V3 Fast");
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatio>("vertical_9_16");
  const [influencerDescription, setInfluencerDescription] = React.useState("normal and casual looking person");
  const [specialRequests, setSpecialRequests] = React.useState(
    "age 22-40; diverse genders; scenes like person in podcast, person in car, everyday mirror selfie",
  );
  const [uploading, setUploading] = React.useState(false);
  const [supabaseUrl, setSupabaseUrl] = React.useState<string | undefined>(undefined);

  const handleGenerate = async () => {
    if (!isHttpUrl(referenceImageUrl)) {
      showError("Please add a public image URL (http/https). Google Drive links are also supported.");
      return;
    }
    setUploading(true);
    try {
      const supaUrl = await storeImageFromUrl(referenceImageUrl);
      setSupabaseUrl(supaUrl);
      const brief: CreativeBrief = {
        referenceImageUrl,
        numberOfVideos: Math.max(1, Math.min(10, Number(numberOfVideos || 1))),
        dialogueMode,
        scriptText: dialogueMode === "provide" ? scriptText : undefined,
        modelChoice,
        aspectRatio,
        influencerDescription,
        specialRequests,
      };
      const scenes = buildScenes(brief);
      onScenesReady?.(brief, scenes, supaUrl);
      showSuccess("Image uploaded and scene prompts generated.");
    } catch (e: any) {
      showError(e?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleCopyDirect = async () => {
    if (!supabaseUrl) return;
    await navigator.clipboard.writeText(supabaseUrl);
    showSuccess("Supabase image link copied.");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Infinite UGC Automation — Creative Brief</CardTitle>
        <CardDescription>Provide inputs and generate structured prompts for images and videos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="referenceImageUrl">Reference Image (any public URL or Google Drive share)</Label>
            <Input
              id="referenceImageUrl"
              placeholder="https://storage.googleapis.com/.../image.jpeg  or  https://drive.google.com/file/d/XXXX/view"
              value={referenceImageUrl}
              onChange={(e) => setReferenceImageUrl(e.target.value)}
              disabled={uploading}
            />
            {supabaseUrl ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">Supabase Hosted</Badge>
                <Button variant="ghost" size="sm" onClick={handleCopyDirect} className="h-7 px-2">
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy link
                </Button>
                <span className="truncate max-w-full">{supabaseUrl}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Paste any publicly accessible image link. For Google Drive, set sharing to “Anyone with the link”.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numberOfVideos">Number of Videos</Label>
            <Input
              id="numberOfVideos"
              type="number"
              min={1}
              max={10}
              value={numberOfVideos}
              onChange={(e) => setNumberOfVideos(parseInt(e.target.value || "1", 10))}
              disabled={uploading}
            />
            <p className="text-sm text-muted-foreground">Create 1–10 scenes per run.</p>
          </div>
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Model Choice</Label>
            <Select value={modelChoice} onValueChange={(v) => setModelChoice(v as ModelChoice)} disabled={uploading}>
              <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="V3 Fast">V3 Fast (cheaper)</SelectItem>
                <SelectItem value="V3 Quality">V3 Quality (higher cost)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)} disabled={uploading}>
              <SelectTrigger><SelectValue placeholder="Select aspect ratio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical_9_16">Vertical (9:16)</SelectItem>
                <SelectItem value="portrait_3_4">Portrait (3:4)</SelectItem>
                <SelectItem value="landscape_16_9">Landscape (16:9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dialogue</Label>
            <Select value={dialogueMode} onValueChange={(v) => setDialogueMode(v as DialogueMode)} disabled={uploading}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="generate">Generate for me</SelectItem>
                <SelectItem value="provide">I will provide a script</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dialogueMode === "provide" && (
          <div className="space-y-2">
            <Label htmlFor="scriptText">Script</Label>
            <Textarea
              id="scriptText"
              placeholder="Paste or write the dialogue script here…"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={4}
              disabled={uploading}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="influencerDescription">Influencer Description</Label>
            <Input
              id="influencerDescription"
              placeholder="e.g., normal and casual looking people, authentic, relatable"
              value={influencerDescription}
              onChange={(e) => setInfluencerDescription(e.target.value)}
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              placeholder="Appearance, age range, diversity, scenes (comma or semicolon separated)"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
              disabled={uploading}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleGenerate} disabled={uploading}>
            <Wand2 className="h-4 w-4 mr-2" />
            {uploading ? "Uploading…" : "Generate Prompts"}
          </Button>
          <span className="text-sm text-muted-foreground">
            Next, you can preview and copy the structured scenes below.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}