"use client";

import * as React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import CreativeBriefForm from "@/components/CreativeBriefForm";
import PromptPreview from "@/components/PromptPreview";
import type { CreativeBrief, SceneOutput } from "../types/ugc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Index = () => {
  const [brief, setBrief] = React.useState<CreativeBrief | undefined>(undefined);
  const [scenes, setScenes] = React.useState<SceneOutput[] | undefined>(undefined);
  const [directImageUrl, setDirectImageUrl] = React.useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="container mx-auto py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Infinite UGC Prompt Factory</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate structured image/video prompts for automated UGC creation. Plug these into your n8n workflow.
          </p>
        </div>

        <Alert>
          <AlertTitle>Next step: Backend for media generation</AlertTitle>
          <AlertDescription>
            To automatically call OpenAI/Key.AI and upload to cloud storage (Steps 2, 5–11), add Supabase so we can run secure functions and store files.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          <CreativeBriefForm
            onScenesReady={(b, s, direct) => {
              setBrief(b);
              setScenes(s);
              setDirectImageUrl(direct);
            }}
          />
          <PromptPreview brief={brief} scenes={scenes} directImageUrl={directImageUrl} />
        </div>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;