import { useCallback, useState } from "react";
import type { UploadState } from "../types";

export function usePhotoUploadState(initialValue?: string) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    isCompressing: false,
    progress: 0,
    error: null,
    preview: initialValue || null,
    originalFile: null,
    compressedFile: null,
  });

  const clearState = useCallback(() => {
    setState({
      isUploading: false,
      isCompressing: false,
      progress: 0,
      error: null,
      preview: null,
      originalFile: null,
      compressedFile: null,
    });
  }, []);

  return { state, setState, clearState };
}
