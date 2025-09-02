import * as React from "react";

type PromptLibraryEntry = {
  id: string;
  name: string;
  createdAt: string;
  promptJson: any;
  fingerprint: string;
  templateVersion: string;
};

type Props = {
  prompts: PromptLibraryEntry[];
  onSelect: (entry: PromptLibraryEntry) => void;
};

export default function PromptLibraryFlipbook({ prompts, onSelect }: Props) {
  const [page, setPage] = React.useState(0);

  if (!prompts.length) return <div className="text-muted-foreground">No saved prompts yet.</div>;

  const entry = prompts[page];

  return (
    <div className="w-full max-w-lg mx-auto bg-card rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <button
          className="text-lg"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          ◀
        </button>
        <div className="font-semibold text-sm">
          {entry.name} <span className="text-xs text-muted-foreground">({entry.createdAt})</span>
        </div>
        <button
          className="text-lg"
          onClick={() => setPage((p) => Math.min(prompts.length - 1, p + 1))}
          disabled={page === prompts.length - 1}
        >
          ▶
        </button>
      </div>
      <pre className="bg-muted rounded p-2 text-xs overflow-x-auto max-h-60 mb-2">
        {JSON.stringify(entry.promptJson, null, 2)}
      </pre>
      <div className="text-xs text-muted-foreground mb-2">
        Version: {entry.templateVersion} | Fingerprint: {entry.fingerprint}
      </div>
      <button
        className="w-full bg-primary text-primary-foreground rounded py-2 font-semibold"
        onClick={() => onSelect(entry)}
      >
        Use This Prompt
      </button>
    </div>
  );
}