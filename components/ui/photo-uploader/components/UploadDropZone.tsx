import { X } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import type { UploadState } from "../types";
import { FileInfo } from "./FileInfo";
import { UploadContent } from "./UploadContent";

interface UploadDropZoneProps {
  dropRef: React.RefObject<HTMLButtonElement | null>;
  isDragOver: boolean;
  disabled: boolean;
  state: UploadState;
  maxSizeKB: number;
  placeholder: string;
  onClear: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function UploadDropZone({
  dropRef,
  isDragOver,
  disabled,
  state,
  maxSizeKB,
  placeholder,
  onClear,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: UploadDropZoneProps) {
  const isLoading = state.isUploading || state.isCompressing;

  const getClassName = () => {
    const base =
      "relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";
    const dragState = isDragOver
      ? "border-primary bg-primary/5"
      : "border-muted-foreground/25 hover:border-muted-foreground/50";
    const disabledState = disabled ? "cursor-not-allowed opacity-50" : "";
    const errorState = state.error
      ? "border-destructive/50 bg-destructive/5"
      : "";

    return `${base} ${dragState} ${disabledState} ${errorState}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <>
      <button
        type="button"
        ref={dropRef}
        className={getClassName()}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={disabled}
        aria-label="Upload photo by clicking or dragging and dropping"
      >
        {/* Clear button */}
        {state.preview && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 rounded-full p-0"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <UploadContent
          state={state}
          placeholder={placeholder}
          maxSizeKB={maxSizeKB}
        />
      </button>

      {state.originalFile && (
        <FileInfo
          originalFile={state.originalFile}
          compressedFile={state.compressedFile}
        />
      )}
    </>
  );
}
