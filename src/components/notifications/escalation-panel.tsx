"use client";

// Minimal stub for escalation panel
export interface EscalationPanelProps {
  className?: string;
}

export function EscalationPanel({ className }: EscalationPanelProps) {
  return (
    <div className={className}>
      <h2 className="mb-4 font-bold text-xl">Escalation Settings</h2>
      <p className="text-gray-600">
        Notification escalation settings coming soon.
      </p>
    </div>
  );
}

export default EscalationPanel;
