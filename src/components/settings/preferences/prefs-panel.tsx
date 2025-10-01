"use client";

// Minimal stub for preferences panel
export interface PrefsPanelProps {
  className?: string;
}

export function PrefsPanel({ className }: PrefsPanelProps) {
  return (
    <div className={className}>
      <h2 className="mb-4 font-bold text-xl">Preferences</h2>
      <p className="text-gray-600">User preferences panel coming soon.</p>
    </div>
  );
}

export default PrefsPanel;
