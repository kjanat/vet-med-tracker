"use client";

// Minimal stub for data panel
export interface DataPanelProps {
  className?: string;
}

export function DataPanel({ className }: DataPanelProps) {
  return (
    <div className={className}>
      <h2 className="mb-4 font-bold text-xl">Data Management</h2>
      <p className="text-gray-600">
        Data privacy and management controls coming soon.
      </p>
    </div>
  );
}

export default DataPanel;
