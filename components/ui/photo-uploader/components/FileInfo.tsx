import { Image as ImageIcon } from "lucide-react";
import { formatFileSize } from "@/lib/utils/image-compression";

interface FileInfoProps {
  originalFile: File;
  compressedFile: File | null;
}

export function FileInfo({ originalFile, compressedFile }: FileInfoProps) {
  const compressionPercentage = compressedFile
    ? Math.round((1 - compressedFile.size / originalFile.size) * 100)
    : 0;

  return (
    <div className="rounded-md bg-muted/50 p-2 text-xs">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        <span className="font-medium">{originalFile.name}</span>
        <span className="text-muted-foreground">
          ({formatFileSize(originalFile.size)})
        </span>
      </div>
      {compressedFile && (
        <div className="mt-1 text-muted-foreground">
          Compressed to {formatFileSize(compressedFile.size)} (
          {compressionPercentage}% reduction)
        </div>
      )}
    </div>
  );
}
