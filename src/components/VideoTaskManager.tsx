"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

type VideoTask = {
  id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  image_urls: string[];
  status: string;
  video_url?: string;
  error?: string;
  created_at: string;
};

const POLL_INTERVAL = 10000; // 10 seconds

export default function VideoTaskManager() {
  const [prompt, setPrompt] = React.useState("");
  const [aspectRatio, setAspectRatio] = React.useState("9:16");
  const [model, setModel] = React.useState("veo3_fast");
  const [imageUrl, setImageUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [tasks, setTasks] = React.useState<VideoTask[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch tasks
  const fetchTasks = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("get-user-tasks", { body: {} });
    if (error) {
      showError("Failed to load tasks");
      setLoading(false);
      return;
    }
    setTasks(data.tasks || []);
    setLoading(false);
  }, []);

  // Poll for updates
  React.useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Submit new task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: any = { prompt, model, aspectRatio };
      if (imageUrl) body.imageUrls = [imageUrl];
      const { data, error } = await supabase.functions.invoke("create-video-task", { body });
      if (error) throw new Error(error.message);
      showSuccess("Video generation started!");
      setPrompt("");
      setImageUrl("");
      fetchTasks();
    } catch (e: any) {
      showError(e?.message || "Failed to start video generation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate VEO3 Video (Async)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Prompt for your video..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            required
            disabled={submitting}
          />
          <div className="flex gap-2">
            <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Aspect Ratio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel} disabled={submitting}>
              <SelectTrigger><SelectValue placeholder="Model" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="veo3_fast">VEO3 Fast</SelectItem>
                <SelectItem value="veo3">VEO3 Quality</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Image URL (optional)"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              disabled={submitting}
            />
          </div>
          <Button type="submit" disabled={submitting || !prompt}>
            {submitting ? "Submitting..." : "Start Generation"}
          </Button>
        </form>
        <Separator />
        <div>
          <h3 className="font-semibold mb-2">Your Video Tasks</h3>
          {loading ? (
            <div>Loading...</div>
          ) : tasks.length === 0 ? (
            <div>No video tasks yet.</div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{task.prompt}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.model} • {task.aspect_ratio} • {task.created_at.slice(0, 19).replace("T", " ")}
                      </div>
                    </div>
                    <div>
                      {task.status === "pending" && <span className="text-yellow-600 font-semibold">Processing…</span>}
                      {task.status === "ready" && <span className="text-green-600 font-semibold">Ready</span>}
                      {task.status === "failed" && <span className="text-red-600 font-semibold">Failed</span>}
                    </div>
                  </div>
                  {task.status === "ready" && task.video_url && (
                    <video src={task.video_url} controls className="mt-2 w-full max-w-md rounded" />
                  )}
                  {task.status === "failed" && (
                    <div className="text-xs text-destructive mt-2">{task.error || "Unknown error"}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}