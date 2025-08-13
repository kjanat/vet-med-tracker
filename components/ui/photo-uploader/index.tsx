"use client";

import type React from "react";
import { useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { usePhotoUpload } from "@/hooks/offline/usePhotoUpload";
import { StatusBar } from "./components/StatusBar";
import { UploadDropZone } from "./components/UploadDropZone";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useFileProcessor } from "./hooks/useFileProcessor";
import { usePhotoUploadState } from "./hooks/usePhotoUploadState";
import type { PhotoUploaderProps } from "./types";

const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function PhotoUploader({
  onUpload,
  onProgress,
  onError,
  disabled = false,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeKB = 5000,
  compressionOptions,
  className = "",
  value,
  placeholder = "Click to upload or drag and drop",
  householdId,
  userId,
  animalId,
}: PhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLButtonElement | null>(null);

  // State management
  const { state, setState, clearState } = usePhotoUploadState(value);

  // Photo upload hook
  const photoUpload = usePhotoUpload({
    householdId,
    userId,
    animalId,
    onUploadSuccess: (url, _photoId) => {
      setState((prev) => ({ ...prev, preview: url }));
      const fileToUpload = state.compressedFile || state.originalFile;
      if (fileToUpload) {
        onUpload?.(url, fileToUpload);
      }
    },
    onUploadError: (error) => {
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
  });

  // File processing
  const { processFile } = useFileProcessor({
    acceptedTypes,
    maxSizeKB,
    compressionOptions,
    photoUpload,
    setState,
    toast,
    onProgress,
  });

  // Drag and drop
  const { isDragOver, dragHandlers } = useDragAndDrop({
    disabled,
    onFileDrop: processFile,
  });

  // File input handlers
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file) await processFile(file);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearState();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <StatusBar photoUpload={photoUpload} />

      <UploadDropZone
        dropRef={dropRef}
        isDragOver={isDragOver}
        disabled={disabled}
        state={state}
        maxSizeKB={maxSizeKB}
        placeholder={placeholder}
        onClear={handleClear}
        onClick={handleClick}
        {...dragHandlers}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={(e) => void handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

// Re-export types for convenience
export type { PhotoUploaderProps } from "./types";
