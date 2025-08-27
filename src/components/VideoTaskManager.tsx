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
import { Trash2, RefreshCw, Search } from "lucide-react";

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

type KieStatus = {
  taskId: string;
  kie: any;
  supabase: VideoTask | null;
};

const POLL_INTERVAL = 10000; // 10 seconds

export default function VideoTaskManager() {
  const [prompt, setPrompt] = React.useState("");
  const [aspectRatio, setAspectRatio] = React.useState("9:16");
  const [model, setModel] = React.useState("veo3_fast");
  const [imageUrl, setImageUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [tasks, setTasks] = React.useState<VideoTask[]>([]);
  const [kieStatuses, setKieStatuses] = React.useState<KieStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Manual KIE status check
  const [manualTaskId, setManualTaskId] = React.useState("");
  const [manualKieStatus, setManualKieStatus] = React.useState<KieStatus | null>(null);

  // Fetch tasks from Supabase
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

  // Fetch live KIE status for all known taskIds
  const fetchKieStatuses = React.useCallback(async (taskIds: string[]) => {
    if (!taskIds.length) {
      setKieStatuses([]);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("get-kie-task-status", { body: { taskIds } });
      if (error) {
        showError("Failed to fetch KIE status");
        setKieStatuses([]);
        return;
      }
      setKieStatuses(data.results || []);
    } catch (e: any) {
      showError(e?.message || "Failed to fetch KIE status");
      setKieStatuses([]);
    }
  }, []);

  // Manual KIE status check
  const handleManualKieCheck = async () => {
    if (!manualTaskId.trim()) return;
    setManualKieStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-kie-task-status", { body: { taskIds: [manualTaskId.trim()] } });
      if (error) {
        showError("Failed to fetch KIE status");
        return;
      }
      setManualKieStatus((data.results && data.results[0]) || null);
    } catch (e: any) {
      showError(e?.message || "Failed to fetch KIE status");
    }
  };

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

  // Fetch KIE status whenever tasks change
  React.useEffect(() => {
    const taskIds = tasks.map(t => t.task_id).filter(Boolean);
    fetchKieStatuses(taskIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

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

  // Helper: get readable KIE status
  function getKieStatusInfo(kie: any) {
    if (!kie || !kie.data) return { status: "Unknown", credits: null, time: null, resultUrls: [] };
    const { successFlag, creditsConsumed, createTime, resultUrls } = kie.data;
    let status = "Unknown";
    if (successFlag === 0) status = "Processing";
    else if (successFlag === 1) status = "Success";
    else if (successFlag === 2 || successFlag === 3) status = "Failed";
    let urls: string[] = [];
    try { if (resultUrls) urls = JSON.parse(resultUrls); } catch {}
    return { status, credits: creditsConsumed, time: createTime, resultUrls: urls };
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate VEO3 Video (Async, Live KIE Status)</CardTitle>
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

        {/* Manual KIE status check */}
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Enter KIE taskId to check status"
            value={manualTaskId}
            onChange={e => setManualTaskId(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="secondary" size="sm" onClick={handleManualKieCheck}>
            <Search className="h-4 w-4 mr-1" /> Check KIE Status
          </Button>
        </div>
        {manualKieStatus && (
          <div className="mb-4 p-2 border rounded bg-muted">
            <div className="font-semibold">Manual KIE Status for {manualKieStatus.taskId}</div>
            <pre className="text-xs">{JSON.stringify(manualKieStatus, null, 2)}</pre>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">All Generations (Live KIE Status)</h3>
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
          {/* Debug output for all taskIds and KIE statuses */}
          <pre className="text-xs bg-muted p-2 rounded mb-2 overflow-x-auto">
            {JSON.stringify({
              taskIds: tasks.map(t => t.task_id),
              kieStatuses
            }, null, 2)}
          </pre>
          {loading ? (
            <div>Loading...</div>
          ) : kieStatuses.length === 0 ? (
            <div>No generations yet.</div>
          ) : (
            <div className="space-y-4">
              {kieStatuses.map(({ taskId, kie, supabase }) => {
                const { status, credits, time, resultUrls } = getKieStatusInfo(kie);
                return (
                  <div key={taskId} className="p-3 border rounded relative">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-medium">Task ID: {taskId}</div>
                        <div className="text-xs text-muted-foreground">
                          Status: {status}
                          {credits !== null && <> • Credits: {credits}</>}
                          {time && <> • Time: {new Date(time).toLocaleString()}</>}
                        </div>
                        {resultUrls.length > 0 && (
                          <div className="text-xs text-muted-foreground break-all">
                            KIE AI Result: <a href={resultUrls[0]} target="_blank" rel="noopener noreferrer" className="underline">Original Video Link</a>
                          </div>
                        )}
                        {supabase?.video_url && (
                          <div className="text-xs text-muted-foreground break-all">
                            Supabase Video: <a href={supabase.video_url} target="_blank" rel="noopener noreferrer" className="underline">View/Download</a>
                          </div>
                        )}
                        {supabase?.prompt && (
                          <div className="text-xs text-muted-foreground">Prompt: {supabase.prompt}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {supabase?.id && (
                          <AlertDialog open={deleteId === supabase.id} onOpenChange={open => setDeleteId(open ? supabase.id : null)}>
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
                                <AlertDialogAction onClick={() => handleDelete(supabase.id!)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    {supabase?.video_url && (
                      <video src={supabase.video_url} controls className="mt-2 w-full max-w-md rounded" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}