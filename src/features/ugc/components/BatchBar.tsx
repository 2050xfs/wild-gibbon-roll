import * as React from "react";

const BatchBar = () => {
  // Placeholder: implement Download All, Stitch, cost summary
  return (
    <div className="flex items-center gap-4 p-3 bg-secondary rounded shadow">
      <button className="btn btn-primary" disabled>Download All (ZIP)</button>
      <button className="btn btn-primary" disabled>Stitch Final Reel</button>
      <span className="ml-auto text-sm text-muted-foreground">Total: $0.00</span>
    </div>
  );
};

export default BatchBar;