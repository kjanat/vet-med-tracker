import type React from "react";
import { useCallback, useState } from "react";

interface UseDragAndDropProps {
  disabled: boolean;
  onFileDrop: (file: File) => Promise<void>;
}

export function useDragAndDrop({ disabled, onFileDrop }: UseDragAndDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0]) {
        void onFileDrop(files[0]);
      }
    },
    [disabled, onFileDrop],
  );

  return {
    isDragOver,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
