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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Trash2, RefreshCw } from "lucide-react";

type VideoTask = {
  id: string;
  prompt: string;
  model: string;
  aspect_ratio: string;
  image_urls: string[];
  status: string;
  video_url?: string;
  kie_ai_result_url?: string;
  kie_ai_credits?: number;
  kie_ai_time?: string;
  task_id: string;
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
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

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

  // Manual refresh for results
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
    showSuccess("Results refreshed");
  };

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
      if (error) {
        showError(error.message || "Failed to start video generation");
        setSubmitting(false);
        return;
      }
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

  // Delete task
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("video_tasks")
      .delete()
      .eq("id", id);
    if (error) {
      showError("Failed to delete video");
    } else {
      showSuccess("Video deleted");
      fetchTasks();
    }
    setDeleteId(null);
  };

  // Robust filter for ready tasks (case-insensitive, trims whitespace)
  const readyTasks = tasks.filter(
    t =>
      typeof t.status === "string" &&
      t.status.trim().toLowerCase() === "ready"
  );
  const pendingTasks = tasks.filter(
    t =>
      typeof t.status !== "string" ||
      t.status.trim().toLowerCase() !== "ready"
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate VEO3 Video (Async)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Debug output for all tasks */}
        <pre className="text-xs bg-muted p-2 rounded mb-2 overflow-x-auto">
          {JSON.stringify(tasks, null, 2)}
        </pre>

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

        {/* Pending/Processing Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Pending/Processing Tasks</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1"
              aria-label="Refresh Results"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Results
            </Button>
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : pendingTasks.length === 0 ? (
            <div>No pending tasks.</div>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{task.prompt || <span className="italic text-muted-foreground">No prompt</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.model} • {task.aspect_ratio} • {task.created_at ? task.created_at.slice(0, 19).replace("T", " ") : ""}
                      </div>
                    </div>
                    <div>
                      {typeof task.status === "string" && task.status.trim().toLowerCase() === "pending" && (
                        <span className="text-yellow-600 font-semibold">Processing…</span>
                      )}
                      {typeof task.status === "string" && task.status.trim().toLowerCase() === "failed" && (
                        <span className="text-red-600 font-semibold">Failed</span>
                      )}
                    </div>
                  </div>
                  {typeof task.status === "string" && task.status.trim().toLowerCase() === "failed" && (
                    <div className="text-xs text-destructive mt-2">{task.error || "Unknown error"}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Ready/Completed Videos */}
        <div>
          <h3 className="font-semibold mb-2">Results Ready</h3>
          {loading ? (
            <div>Loading...</div>
          ) : readyTasks.length === 0 ? (
            <div>No completed videos yet.</div>
          ) : (
            <div className="space-y-4">
              {readyTasks.map(task => (
                <div key={task.id} className="p-3 border rounded relative">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-medium">{task.prompt || <span className="italic text-muted-foreground">No prompt</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        Model: {task.model} • Aspect: {task.aspect_ratio} • Created: {task.created_at ? task.created_at.slice(0, 19).replace("T", " ") : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>Task ID: {task.task_id}</span>
                        {task.kie_ai_credits !== undefined && (
                          <> • Credits: {task.kie_ai_credits}</>
                        )}
                        {task.kie_ai_time && (
                          <> • Time: {new Date(task.kie_ai_time).toLocaleString()}</>
                        )}
                      </div>
                      {task.kie_ai_result_url && (
                        <div className="text-xs text-muted-foreground break-all">
                          KIE AI Result: <a href={task.kie_ai_result_url} target="_blank" rel="noopener noreferrer" className="underline">Original Video Link</a>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog open={deleteId === task.id} onOpenChange={open => setDeleteId(open ? task.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8" aria-label="Delete video">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this video?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. Are you sure you want to permanently delete this video?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(task.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {task.video_url && (
                    <video src={task.video_url} controls className="mt-2 w-full max-w-md rounded" />
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