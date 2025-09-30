"use client";

import { useState } from "react";

// Minimal stub for viewport tester
export interface ViewportTesterProps {
  className?: string;
}

export function ViewportTester({ className }: ViewportTesterProps) {
  const [viewport, setViewport] = useState("desktop");

  const viewports = [
    { height: "667px", name: "Mobile", width: "375px" },
    { height: "1024px", name: "Tablet", width: "768px" },
    { height: "800px", name: "Desktop", width: "1200px" },
  ];

  return (
    <div className={className}>
      <h2 className="mb-4 font-bold text-xl">Viewport Tester</h2>
      <div className="mb-4 flex gap-2">
        {viewports.map((vp) => (
          <button
            className={`rounded border px-3 py-1 ${
              viewport === vp.name ? "bg-blue-500 text-white" : "bg-white"
            }`}
            key={vp.name}
            onClick={() => setViewport(vp.name)}
            type="button"
          >
            {vp.name}
          </button>
        ))}
      </div>
      <p className="text-gray-600">
        Viewport testing functionality coming soon.
      </p>
    </div>
  );
}

export default ViewportTester;
