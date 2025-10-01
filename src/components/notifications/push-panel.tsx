"use client";

// Minimal stub for push panel
export interface PushPanelProps {
  className?: string;
}

export function PushPanel({ className }: PushPanelProps) {
  return (
    <div className={className}>
      <h2 className="mb-4 font-bold text-xl">Push Notifications</h2>
      <p className="text-gray-600">Push notification settings coming soon.</p>
    </div>
  );
}

export default PushPanel;
