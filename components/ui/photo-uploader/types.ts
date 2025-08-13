import type { CompressionOptions } from "@/lib/utils/image-compression";

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

export interface UploadState {
  isUploading: boolean;
  isCompressing: boolean;
  progress: number;
  error: string | null;
  preview: string | null;
  originalFile: File | null;
  compressedFile: File | null;
}
