import { formatFileSize } from "@/lib/utils/image-compression";

export function validateFile(
  file: File,
  acceptedTypes: string[],
  maxSizeKB: number,
): { isValid: boolean; error?: string } {
  // Check file type
  if (!acceptedTypes.includes(file.type)) {
    return {
      error: `File type ${file.type} is not supported. Allowed types: ${acceptedTypes.join(", ")}`,
      isValid: false,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeKB * 1024;
  if (file.size > maxSizeBytes) {
    return {
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${formatFileSize(maxSizeBytes)}`,
      isValid: false,
    };
  }

  return { isValid: true };
}
