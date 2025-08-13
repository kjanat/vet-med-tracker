"use client";

import {
  Image as ImageIcon,
  Loader2,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { usePhotoUpload } from "@/hooks/offline/usePhotoUpload";
import {
  type CompressionOptions,
  compressImage,
  formatFileSize,
  isCompressionSupported,
} from "@/lib/utils/image-compression";

export interface PhotoUploaderProps {
  onUpload?: (url: string, file: File) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSizeKB?: number;
  compressionOptions?: CompressionOptions;
  className?: string;
  value?: string; // Current photo URL
  placeholder?: string;
  // Required for offline functionality
  householdId: string;
  userId: string;
  animalId?: string;
}

interface UploadState {
  isUploading: boolean;
  isCompressing: boolean;
  progress: number;
  error: string | null;
  preview: string | null;
  originalFile: File | null;
  compressedFile: File | null;
}

const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function PhotoUploader({
  onUpload,
  onProgress: _onProgress,
  onError,
  disabled = false,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeKB = 5000, // 5MB default
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
  const dropRef = useRef<HTMLDivElement>(null);

  // Use the photo upload hook
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

  const [state, setState] = useState<UploadState>({
    isUploading: false,
    isCompressing: false,
    progress: 0,
    error: null,
    preview: value || null,
    originalFile: null,
    compressedFile: null,
  });

  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Validate file type and size
   */
  const validateFile = useCallback(
    (file: File): { isValid: boolean; error?: string } => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        return {
          isValid: false,
          error: `File type ${file.type} is not supported. Allowed types: ${acceptedTypes.join(", ")}`,
        };
      }

      // Check file size
      const maxSizeBytes = maxSizeKB * 1024;
      if (file.size > maxSizeBytes) {
        return {
          isValid: false,
          error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${formatFileSize(maxSizeBytes)}`,
        };
      }

      return { isValid: true };
    },
    [acceptedTypes, maxSizeKB],
  );

  /**
   * Handle progress updates from the upload hook
   */
  // Note: handleProgress is not currently used but may be needed for future progress tracking
  // const handleProgress = useCallback(
  //	(progress: number) => {
  //		setState((prev) => ({ ...prev, progress }));
  //		onProgress?.(progress);
  //	},
  //	[onProgress],
  // );

  /**
   * Process and upload file
   */
  const processFile = useCallback(
    async (file: File) => {
      try {
        setState((prev) => ({
          ...prev,
          error: null,
          originalFile: file,
          preview: URL.createObjectURL(file),
        }));

        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        let fileToUpload = file;

        // Compress if supported and file is large enough to benefit
        if (isCompressionSupported() && file.size > 100 * 1024) {
          // Only compress files > 100KB
          setState((prev) => ({ ...prev, isCompressing: true }));

          try {
            const result = await compressImage(file, compressionOptions);
            fileToUpload = result.file;

            setState((prev) => ({ ...prev, compressedFile: result.file }));

            toast({
              title: "Image compressed",
              description: `Reduced from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)} (${Math.round((1 - result.compressionRatio) * 100)}% reduction)`,
            });
          } catch (compressionError) {
            console.warn(
              "Compression failed, using original file:",
              compressionError,
            );
            // Continue with original file if compression fails
          }

          setState((prev) => ({ ...prev, isCompressing: false }));
        }

        // Upload using the hook
        setState((prev) => ({ ...prev, isUploading: true, progress: 0 }));

        await photoUpload.uploadPhoto(fileToUpload);

        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setState((prev) => ({
          ...prev,
          isUploading: false,
          isCompressing: false,
          error: errorMessage,
          progress: 0,
        }));

        // Error handling is done in the hook
      }
    },
    [validateFile, compressionOptions, photoUpload, toast],
  );

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  /**
   * Handle click to open file picker
   */
  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  /**
   * Handle keyboard events to open file picker
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled],
  );

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [disabled, handleFileSelect],
  );

  /**
   * Clear current photo
   */
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    setState((prev) => ({
      ...prev,
      preview: null,
      originalFile: null,
      compressedFile: null,
      error: null,
      progress: 0,
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const isLoading = state.isUploading || state.isCompressing;
  const showProgress = isLoading && state.progress > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">Photo</div>

        {/* Online/Offline status indicator */}
        <div className="flex items-center gap-1 text-xs">
          {photoUpload.isOnline ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-orange-500" />
              <span className="text-muted-foreground">Offline</span>
            </>
          )}

          {/* Sync stats */}
          {photoUpload.stats.pending > 0 && (
            <span className="ml-2 text-orange-500">
              ({photoUpload.stats.pending} pending)
            </span>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <button
        type="button"
        ref={dropRef}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
          ${state.error ? "border-destructive/50 bg-destructive/5" : ""}
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        aria-label="Upload photo by clicking or dragging and dropping"
      >
        {/* Clear button for existing photo */}
        {state.preview && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 rounded-full p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Preview or upload prompt */}
        {state.preview ? (
          <div className="space-y-2">
            <img
              src={state.preview}
              alt="Preview"
              className="mx-auto max-h-32 rounded-md object-cover"
            />
            {!isLoading && (
              <p className="text-muted-foreground text-xs">
                Click to change photo
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {isLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            )}
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
          </div>
        )}

        {/* Progress bar */}
        {showProgress && (
          <div className="mt-3">
            <Progress value={state.progress} className="h-2" />
            <p className="mt-1 text-muted-foreground text-xs">
              {state.progress}% complete
            </p>
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2">
            <p className="text-destructive text-xs">{state.error}</p>
          </div>
        )}
      </button>

      {/* File info */}
      {state.originalFile && (
        <div className="rounded-md bg-muted/50 p-2 text-xs">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span className="font-medium">{state.originalFile.name}</span>
            <span className="text-muted-foreground">
              ({formatFileSize(state.originalFile.size)})
            </span>
          </div>
          {state.compressedFile && (
            <div className="mt-1 text-muted-foreground">
              Compressed to {formatFileSize(state.compressedFile.size)}(
              {Math.round(
                (1 - state.compressedFile.size / state.originalFile.size) * 100,
              )}
              % reduction)
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
