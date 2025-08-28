"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

export default function ManualTaskIdEntry({ onInserted }: { onInserted?: () => void }) {
  const [taskId, setTaskId] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleInsert = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("insert-task-id", {
        body: { taskId: taskId.trim(), prompt: prompt.trim() }
      });
      if (error) throw new Error(error.message);
      showSuccess("Task ID inserted!");
      setTaskId("");
      setPrompt("");
      onInserted?.();
    } catch (e: any) {
      showError(e?.message || "Failed to insert task ID");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-2 items-center mb-4">
      <Input
        placeholder="KIE AI Task ID"
        value={taskId}
        onChange={e => setTaskId(e.target.value)}
        className="max-w-xs"
      />
      <Input
        placeholder="Prompt (optional)"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        className="max-w-xs"
      />
      <Button onClick={handleInsert} disabled={submitting || !taskId.trim()}>
        Insert Task ID
      </Button>
    </div>
  );
}