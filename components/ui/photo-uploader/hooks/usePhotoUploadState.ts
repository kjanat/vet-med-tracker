import { useCallback, useState } from "react";
import type { UploadState } from "../types";

export function usePhotoUploadState(initialValue?: string) {
  const [state, setState] = useState<UploadState>({
    compressedFile: null,
    error: null,
    isCompressing: false,
    isUploading: false,
    originalFile: null,
    preview: initialValue || null,
    progress: 0,
  });

  const clearState = useCallback(() => {
    setState({
      compressedFile: null,
      error: null,
      isCompressing: false,
      isUploading: false,
      originalFile: null,
      preview: null,
      progress: 0,
    });
  }, []);

  return { clearState, setState, state };
}
