import type React from "react";
import {
  type CompressionOptions,
  compressImage,
  formatFileSize,
  isCompressionSupported,
} from "@/lib/utils/image-compression";
import type { UploadState } from "../types";

type ToastFunction = (props: { title?: string; description?: string }) => void;

export async function compressImageIfNeeded(
  file: File,
  compressionOptions: CompressionOptions | undefined,
  setState: React.Dispatch<React.SetStateAction<UploadState>>,
  toast: ToastFunction,
): Promise<File> {
  // Skip compression for small files or if not supported
  if (!isCompressionSupported() || file.size <= 100 * 1024) {
    return file;
  }

  setState((prev) => ({ ...prev, isCompressing: true }));

  try {
    const result = await compressImage(file, compressionOptions);
    setState((prev) => ({
      ...prev,
      compressedFile: result.file,
      isCompressing: false,
    }));

    toast({
      title: "Image compressed",
      description: `Reduced from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)} (${Math.round((1 - result.compressionRatio) * 100)}% reduction)`,
    });

    return result.file;
  } catch (error) {
    console.warn("Compression failed, using original file:", error);
    setState((prev) => ({ ...prev, isCompressing: false }));
    return file;
  }
}
