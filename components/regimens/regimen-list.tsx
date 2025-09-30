"use client";

// Minimal stub for regimen list
export interface RegimenListProps {
  regimens?: any[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RegimenList({
  regimens = [],
  onEdit,
  onDelete,
}: RegimenListProps) {
  return (
    <div className="space-y-4">
      {regimens.map((regimen) => (
        <div className="rounded border p-4" key={regimen.id}>
          <h3>{regimen.medicationName}</h3>
          <p>{regimen.instructions}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="text-blue-500"
              onClick={() => onEdit?.(regimen.id)}
              type="button"
            >
              Edit
            </button>
            <button
              className="text-red-500"
              onClick={() => onDelete?.(regimen.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      {regimens.length === 0 && (
        <p className="text-gray-500">No regimens found</p>
      )}
    </div>
  );
}

export default RegimenList;
