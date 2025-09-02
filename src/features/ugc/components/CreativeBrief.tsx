import * as React from "react";

type Props = {
  onBriefChange?: (brief: any) => void;
  onImageUrlChange?: (url: string) => void;
};

const CreativeBrief = ({ onBriefChange, onImageUrlChange }: Props) => {
  const [numVideos, setNumVideos] = React.useState(3);
  const [scriptMode, setScriptMode] = React.useState<"manual" | "ai">("ai");
  const [scriptText, setScriptText] = React.useState("");
  const [influencer, setInfluencer] = React.useState("");
  const [aspect, setAspect] = React.useState("vertical_9_16");
  const [model, setModel] = React.useState("V3 Fast");
  const [imageUrl, setImageUrl] = React.useState("");

  React.useEffect(() => {
    onBriefChange?.({
      numberOfVideos: numVideos,
      dialogueMode: scriptMode === "ai" ? "generate" : "provide",
      scriptText,
      influencerDescription: influencer,
      aspectRatio: aspect,
      modelChoice: model,
      specialRequests: "",
    });
    // eslint-disable-next-line
  }, [numVideos, scriptMode, scriptText, influencer, aspect, model]);

  React.useEffect(() => {
    onImageUrlChange?.(imageUrl);
    // eslint-disable-next-line
  }, [imageUrl]);

  return (
    <div className="p-4 bg-card rounded shadow space-y-3">
      <h2 className="font-semibold mb-2">Creative Brief</h2>
      <div>
        <label className="block text-sm font-medium mb-1">Product Image URL</label>
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder="Paste image URL or Google Drive link"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Number of Videos</label>
        <input
          type="number"
          min={1}
          max={10}
          className="w-full border rounded p-2"
          value={numVideos}
          onChange={(e) => setNumVideos(Number(e.target.value))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Script</label>
        <div className="flex gap-2 mb-1">
          <button
            className={`px-2 py-1 rounded ${scriptMode === "ai" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            onClick={() => setScriptMode("ai")}
            type="button"
          >
            AI Generate
          </button>
          <button
            className={`px-2 py-1 rounded ${scriptMode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            onClick={() => setScriptMode("manual")}
            type="button"
          >
            Manual
          </button>
        </div>
        {scriptMode === "manual" && (
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            placeholder="Paste or write your script here"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Influencer Details</label>
        <input
          className="w-full border rounded p-2"
          placeholder="e.g. appearance, age range, gender, scene requests"
          value={influencer}
          onChange={(e) => setInfluencer(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Aspect Ratio</label>
        <select
          className="w-full border rounded p-2"
          value={aspect}
          onChange={(e) => setAspect(e.target.value)}
        >
          <option value="vertical_9_16">Vertical (9:16)</option>
          <option value="portrait_3_4">Portrait (3:4)</option>
          <option value="landscape_16_9">Landscape (16:9)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <select
          className="w-full border rounded p-2"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="V3 Fast">V3 Fast</option>
          <option value="V3 Quality">V3 Quality</option>
        </select>
      </div>
    </div>
  );
};

export default CreativeBrief;