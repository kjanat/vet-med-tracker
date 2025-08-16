import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/utils/image-compression";
import type { UploadState } from "../types";

interface UploadContentProps {
  state: UploadState;
  placeholder: string;
  maxSizeKB: number;
}

export function UploadContent({
  state,
  placeholder,
  maxSizeKB,
}: UploadContentProps) {
  const isLoading = state.isUploading || state.isCompressing;
  const showProgress = isLoading && state.progress > 0;

  if (state.preview) {
    return (
      <div className="space-y-2">
        <div className="relative mx-auto h-32 w-32">
          <Image
            src={state.preview}
            alt="Preview"
            fill
            className="rounded-md object-cover"
            sizes="128px"
          />
        </div>
        {!isLoading && (
          <p className="text-muted-foreground text-xs">Click to change photo</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Icon */}
      {isLoading ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
      )}

      {/* Text */}
      <div>
        <p className="text-muted-foreground text-sm">
          {isLoading
            ? state.isCompressing
              ? "Compressing image..."
              : "Uploading..."
            : placeholder}
        </p>
        <p className="text-muted-foreground text-xs">
          PNG, JPG, WebP up to {formatFileSize(maxSizeKB * 1024)}
        </p>
      </div>

      {/* Progress */}
      {showProgress && (
        <div className="mt-3">
          <Progress value={state.progress} className="h-2" />
          <p className="mt-1 text-muted-foreground text-xs">
            {state.progress}% complete
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="mt-2 rounded-md bg-destructive/10 p-2">
          <p className="text-destructive text-xs">{state.error}</p>
        </div>
      )}
    </div>
  );
}
