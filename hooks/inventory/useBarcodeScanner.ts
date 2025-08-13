"use client";

import type { MutableRefObject, RefObject } from "react";
import { useCallback, useRef, useState } from "react";

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
}

interface BarcodeDetectorWindow extends Window {
  BarcodeDetector: {
    new (): {
      detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
    };
  };
}

export function useBarcodeScanner({ onScan, onError }: BarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);

  const stopScanning = useCallback(() => {
    isScanningRef.current = false;
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    try {
      isScanningRef.current = true;
      setIsScanning(true);

      // Check if BarcodeDetector is available
      if ("BarcodeDetector" in window) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        streamRef.current = stream;
        setHasPermission(true);

        if (videoRef.current) {
          setupVideoAndDetection(
            stream,
            videoRef,
            isScanningRef,
            onScan,
            stopScanning,
          );
        }
      } else {
        onError("Barcode scanning not supported on this device");
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setHasPermission(false);
      onError("Camera access denied. Please use manual entry.");
      setIsScanning(false);
    }
  }, [onScan, onError, stopScanning]);

  return {
    isScanning,
    hasPermission,
    videoRef,
    startScanning,
    stopScanning,
  };
}

// Helper function to setup video and detection
function setupVideoAndDetection(
  stream: MediaStream,
  videoRef: RefObject<HTMLVideoElement | null>,
  isScanningRef: MutableRefObject<boolean>,
  onScan: (barcode: string) => void,
  stopScanning: () => void,
) {
  if (!videoRef.current) return;

  videoRef.current.srcObject = stream;
  videoRef.current.play();

  const barcodeDetector = new (
    window as unknown as BarcodeDetectorWindow
  ).BarcodeDetector();

  const detectBarcode = async () => {
    if (!videoRef.current || !isScanningRef.current) return;

    try {
      const barcodes = await barcodeDetector.detect(videoRef.current);
      if (barcodes.length > 0) {
        const firstBarcode = barcodes[0];
        if (firstBarcode) {
          onScan(firstBarcode.rawValue);
          stopScanning();
          return;
        }
      }
    } catch (err) {
      console.warn("Barcode detection failed:", err);
    }

    if (isScanningRef.current) {
      requestAnimationFrame(detectBarcode);
    }
  };

  detectBarcode();
}
