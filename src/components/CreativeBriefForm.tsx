"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { showSuccess } from "@/utils/toast";
import type { AspectRatio, CreativeBrief, DialogueMode, ModelChoice } from "../types/ugc";
import { Copy } from "lucide-react";
import { storeImageFromUrl } from "@/utils/storeImage";

function isHttpUrl(s?: string) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type Props = {
  onBriefChange?: (brief: CreativeBrief, directImageUrl?: string) => void;
};

export default function CreativeBriefForm({ onBriefChange }: Props) {
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

  // Effect: whenever any field changes, and image is valid, upload and call onBriefChange
  React.useEffect(() => {
    let cancelled = false;
    async function process() {
      if (!isHttpUrl(referenceImageUrl)) {
        setSupabaseUrl(undefined);
        onBriefChange?.(
          {
            referenceImageUrl,
            numberOfVideos: Math.max(1, Math.min(10, Number(numberOfVideos || 1))),
            dialogueMode,
            scriptText: dialogueMode === "provide" ? scriptText : undefined,
            modelChoice,
            aspectRatio,
            influencerDescription,
            specialRequests,
          },
          undefined
        );
        return;
      }
      setUploading(true);
      try {
        const supaUrl = await storeImageFromUrl(referenceImageUrl);
        if (!cancelled) {
          setSupabaseUrl(supaUrl);
          onBriefChange?.(
            {
              referenceImageUrl,
              numberOfVideos: Math.max(1, Math.min(10, Number(numberOfVideos || 1))),
              dialogueMode,
              scriptText: dialogueMode === "provide" ? scriptText : undefined,
              modelChoice,
              aspectRatio,
              influencerDescription,
              specialRequests,
            },
            supaUrl
          );
        }
      } catch {
        if (!cancelled) {
          setSupabaseUrl(undefined);
          onBriefChange?.(
            {
              referenceImageUrl,
              numberOfVideos: Math.max(1, Math.min(10, Number(numberOfVideos || 1))),
              dialogueMode,
              scriptText: dialogueMode === "provide" ? scriptText : undefined,
              modelChoice,
              aspectRatio,
              influencerDescription,
              specialRequests,
            },
            undefined
          );
        }
      } finally {
        if (!cancelled) setUploading(false);
      }
    }
    process();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [
    referenceImageUrl,
    numberOfVideos,
    dialogueMode,
    scriptText,
    modelChoice,
    aspectRatio,
    influencerDescription,
    specialRequests,
  ]);

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
                <button
                  type="button"
                  className="h-7 px-2 rounded bg-muted text-xs flex items-center"
                  onClick={handleCopyDirect}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy link
                </button>
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
      </CardContent>
    </Card>
  );
}