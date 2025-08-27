"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showError, showSuccess } from "@/utils/toast";
import { kieRequest, type KieMethod } from "@/utils/kie";
import { Copy, RefreshCw } from "lucide-react";

type Props = {
  defaultPath?: string;
  defaultMethod?: KieMethod;
  defaultBody?: unknown;
  title?: string;
  description?: string;
};

type PresetKey = "text_to_video" | "image_to_video" | "get_task_status" | "get_hd_video";

type Preset = {
  key: PresetKey;
  label: string;
  method: KieMethod;
  pathTemplate: string; // may include {task_id}
  description: string;
  makeBody?: (defaults?: any) => any;
  needsTaskId?: boolean;
};

// Helpers to build sane default bodies from scene template (if present)
function makeTextToVideoBody(defaults?: any) {
  return {
    prompt: defaults?.prompt || "A short realistic UGC-style testimonial video about the product.",
    model: defaults?.model || "veo3-1",
    aspect_ratio: defaults?.aspect_ratio || "9:16",
    // Add other optional fields per docs as needed
  };
}
function makeImageToVideoBody(defaults?: any) {
  return {
    prompt: defaults?.prompt || "A short realistic UGC-style testimonial video about the product.",
    model: defaults?.model || "veo3-1",
    aspect_ratio: defaults?.aspect_ratio || "9:16",
    init_image_url: defaults?.init_image_url || "https://example.com/your-image.jpg",
  };
}

const PRESETS: Preset[] = [
  {
    key: "text_to_video",
    label: "Text to Video",
    method: "POST",
    pathTemplate: "/v1/veo3/videos",
    description: "Generate a VEO3 video from text only.",
    makeBody: makeTextToVideoBody,
  },
  {
    key: "image_to_video",
    label: "Image to Video",
    method: "POST",
    pathTemplate: "/v1/veo3/videos",
    description: "Generate a VEO3 video from a reference image + text.",
    makeBody: makeImageToVideoBody,
  },
  {
    key: "get_task_status",
    label: "Get Task Status",
    method: "GET",
    pathTemplate: "/v1/tasks/{task_id}",
    description: "Poll task status using the task ID returned from generation.",
    needsTaskId: true,
  },
  {
    key: "get_hd_video",
    label: "Get 1080p Video (HD)",
    method: "GET",
    // Adjust this path to the exact one in your KIE docs if different:
    pathTemplate: "/v1/veo3/videos/{task_id}/1080p",
    description: "Fetch/download the 1080p video for a completed task.",
    needsTaskId: true,
  },
];

export default function KieConsole({
  defaultPath = "/v1/veo3/videos",
  defaultMethod = "POST",
  defaultBody,
  title = "KIE AI Console",
  description = "Use presets to quickly call KIE via the secure proxy. Adjust the path or body if needed.",
}: Props) {
  const [presetKey, setPresetKey] = React.useState<PresetKey>("text_to_video");
  const [method, setMethod] = React.useState<KieMethod>(defaultMethod);
  const [path, setPath] = React.useState(defaultPath);
  const [taskId, setTaskId] = React.useState("");
  const [body, setBody] = React.useState<string>(() =>
    defaultBody ? JSON.stringify(defaultBody, null, 2) : JSON.stringify(makeTextToVideoBody(), null, 2)
  );
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<{ status: number; data: unknown } | null>(null);

  const currentPreset = React.useMemo(
    () => PRESETS.find((p) => p.key === presetKey)!,
    [presetKey]
  );

  // Build path with params if needed
  const buildPathFromPreset = React.useCallback(
    (p: Preset, tId: string) => {
      if (!p.needsTaskId) return p.pathTemplate;
      return p.pathTemplate.replace("{task_id}", tId || "{task_id}");
    },
    []
  );

  // Prefill body from preset
  const applyPresetBody = React.useCallback(
    (p: Preset) => {
      if (!p.makeBody) return;
      // Try to parse existing body to carry forward scene defaults if present
      let existing: any = undefined;
      try {
        existing = JSON.parse(body);
      } catch {
        existing = undefined;
      }
      const defaults = existing || defaultBody || undefined;
      const newBody = p.makeBody(defaults);
      setBody(JSON.stringify(newBody, null, 2));
    },
    [body, defaultBody]
  );

  // When preset changes, update method, path, and body
  React.useEffect(() => {
    setMethod(currentPreset.method);
    setPath(buildPathFromPreset(currentPreset, taskId));
    if (currentPreset.makeBody) {
      // If we have a scene-derived defaultBody, use it to prefill
      applyPresetBody(currentPreset);
    } else {
      // GET endpoints: clear body
      setBody("{\n  \n}");
    }
    setResponse(null);
  }, [currentPreset, buildPathFromPreset, applyPresetBody, taskId]);

  // Update path when taskId changes
  React.useEffect(() => {
    setPath(buildPathFromPreset(currentPreset, taskId));
  }, [taskId, currentPreset, buildPathFromPreset]);

  const send = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const parsed = method === "GET" ? undefined : body ? JSON.parse(body) : undefined;
      const res = await kieRequest(path, method, parsed);
      setResponse(res);
      showSuccess(`KIE responded with ${res.status}`);
    } catch (e: any) {
      showError(e?.message || "Request failed");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    showSuccess("Response copied");
  };

  const resetToPresetDefaults = () => {
    if (currentPreset.makeBody) {
      applyPresetBody(currentPreset);
    } else {
      setBody("{\n  \n}");
    }
    setResponse(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Endpoint Preset</Label>
            <Select value={presetKey} onValueChange={(v) => setPresetKey(v as PresetKey)}>
              <SelectTrigger><SelectValue placeholder="Choose preset" /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{currentPreset.description}</p>
          </div>

          {currentPreset.needsTaskId && (
            <div className="space-y-2">
              <Label htmlFor="kie-task-id">Task ID</Label>
              <Input
                id="kie-task-id"
                placeholder="paste task id..."
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Used to build the URL for GET requests.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as KieMethod)}>
              <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="kie-path">KIE API Path</Label>
            <Input
              id="kie-path"
              placeholder="/v1/veo3/videos"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paths should match the docs exactly: https://docs.kie.ai/veo3-api/quickstart
            </p>
          </div>
          <div className="space-y-2">
            <Label>Preset Tools</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={resetToPresetDefaults}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reset body
              </Button>
            </div>
          </div>
        </div>

        {method === "POST" && (
          <div className="space-y-2">
            <Label htmlFor="kie-body">Request Body (JSON)</Label>
            <Textarea
              id="kie-body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={send} disabled={loading}>
            {loading ? "Sending…" : "Send Request"}
          </Button>
          {response && (
            <Button variant="secondary" onClick={copyResponse}>
              <Copy className="h-4 w-4 mr-2" /> Copy Response
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Response</Label>
          <pre className="text-xs p-3 rounded-md bg-muted overflow-auto max-h-80">
{response ? JSON.stringify(response, null, 2) : "// No response yet"}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}