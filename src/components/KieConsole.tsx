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
import { Copy } from "lucide-react";

type Props = {
  defaultPath?: string;
  defaultMethod?: KieMethod;
  defaultBody?: unknown;
  title?: string;
  description?: string;
};

export default function KieConsole({
  defaultPath = "/v1/veo3/videos",
  defaultMethod = "POST",
  defaultBody,
  title = "KIE AI Console",
  description = "Send a request through the secure proxy to verify configuration and see responses.",
}: Props) {
  const [path, setPath] = React.useState(defaultPath);
  const [method, setMethod] = React.useState<KieMethod>(defaultMethod);
  const [body, setBody] = React.useState<string>(() =>
    defaultBody ? JSON.stringify(defaultBody, null, 2) : "{\n  \n}"
  );
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<{ status: number; data: unknown } | null>(null);

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              Use exact paths from the docs: https://docs.kie.ai/veo3-api/quickstart
            </p>
          </div>
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