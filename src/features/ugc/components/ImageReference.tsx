import * as React from "react";
import { useUgcStore } from "@/features/ugc/state/ugcStore";

function isHttpUrl(s?: string) {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const ImageReference = () => {
  const [input, setInput] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const setImage = useUgcStore((s) => s.setImage);

  React.useEffect(() => {
    if (isHttpUrl(input)) {
      setPreviewUrl(input);
      setImage?.(input);
    } else {
      setPreviewUrl(null);
      setImage?.(undefined);
    }
  }, [input, setImage]);

  return (
    <div className="p-4 bg-card rounded shadow">
      <h2 className="font-semibold mb-2">Product Image</h2>
      <input
        type="text"
        className="w-full border rounded p-2"
        placeholder="Paste image URL or Google Drive link"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {previewUrl && (
        <div className="mt-3 flex flex-col items-center">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-40 rounded border"
            onError={() => setPreviewUrl(null)}
          />
          <span className="text-xs text-muted-foreground mt-1 break-all">{previewUrl}</span>
        </div>
      )}
    </div>
  );
};

export default ImageReference;