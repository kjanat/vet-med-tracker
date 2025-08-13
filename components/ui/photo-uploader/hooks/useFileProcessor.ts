import type React from "react";
import { useCallback } from "react";
import type { CompressionOptions } from "@/lib/utils/image-compression";
import type { UploadState } from "../types";
import { compressImageIfNeeded } from "../utils/compression";
import { validateFile } from "../utils/validation";

interface PhotoUploadReturn {
  uploadPhoto: (file: File) => Promise<string>;
  isOnline: boolean;
  stats: { pending: number };
}

type ToastFunction = (props: { title?: string; description?: string }) => void;

interface UseFileProcessorProps {
  acceptedTypes: string[];
  maxSizeKB: number;
  compressionOptions?: CompressionOptions;
  photoUpload: PhotoUploadReturn;
  setState: React.Dispatch<React.SetStateAction<UploadState>>;
  toast: ToastFunction;
  onProgress?: (progress: number) => void;
}

export function useFileProcessor({
  acceptedTypes,
  maxSizeKB,
  compressionOptions,
  photoUpload,
  setState,
  toast,
}: UseFileProcessorProps) {
  const processFile = useCallback(
    async (file: File) => {
      // Validate
      const validation = validateFile(file, acceptedTypes, maxSizeKB);
      if (!validation.isValid) {
        setState((prev) => ({
          ...prev,
          error: validation.error || "Invalid file",
          isUploading: false,
          isCompressing: false,
          progress: 0,
        }));
        return;
      }

      // Set preview
      setState((prev) => ({
        ...prev,
        error: null,
        originalFile: file,
        preview: URL.createObjectURL(file),
      }));

      try {
        // Compress
        const fileToUpload = await compressImageIfNeeded(
          file,
          compressionOptions,
          setState,
          toast,
        );

        // Upload
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
      }
    },
    [
      acceptedTypes,
      maxSizeKB,
      compressionOptions,
      photoUpload,
      setState,
      toast,
    ],
  );

  return { processFile };
}
