import * as React from "react";

const ImageReference = () => {
  // Placeholder: implement upload/link input and preview
  return (
    <div className="p-4 bg-card rounded shadow">
      <h2 className="font-semibold mb-2">Product Image</h2>
      <input type="text" className="w-full border rounded p-2" placeholder="Paste image URL or Google Drive link" />
      {/* TODO: Show thumbnail preview */}
    </div>
  );
};

export default ImageReference;