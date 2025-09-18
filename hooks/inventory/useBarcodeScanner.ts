"use client";

import { type RefObject, useCallback, useRef, useState } from "react";

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError: (error: string) => void;
}

// Narrowing shim for browsers that expose BarcodeDetector
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
  const isScanningRef = useRef(false); // React 19 types: RefObject<boolean>

  const stopScanning = useCallback(() => {
    isScanningRef.current = false;
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    try {
      if (
        !("mediaDevices" in navigator) ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        onError("Camera API not available in this browser");
        setIsScanning(false);
        setHasPermission(false);
        return;
      }

      if (!("BarcodeDetector" in window)) {
        onError("Barcode scanning not supported on this device");
        setIsScanning(false);
        return;
      }

      isScanningRef.current = true;
      setIsScanning(true);

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
    } catch (err) {
      console.error("Camera access failed:", err);
      setHasPermission(false);
      onError("Camera access denied. Please use manual entry.");
      setIsScanning(false);
    }
  }, [onScan, onError, stopScanning]);

  return {
    hasPermission,
    isScanning,
    startScanning,
    stopScanning,
    videoRef,
  };
}

// Helper function to set up video and detection
function setupVideoAndDetection(
  stream: MediaStream,
  videoRef: RefObject<HTMLVideoElement | null>,
  isScanningRef: RefObject<boolean>,
  onScan: (barcode: string) => void,
  stopScanning: () => void,
) {
  if (!videoRef.current) return;

  videoRef.current.srcObject = stream;

  // play() returns a Promise in modern browsers; ignore failure (e.g., autoplay policies)
  void videoRef.current.play().catch((e) => {
    console.warn("Video play failed (autoplay policy?):", e);
  });

  const barcodeDetector = new (
    window as unknown as BarcodeDetectorWindow
  ).BarcodeDetector();

  function detectBarcode() {
    if (!videoRef.current || !isScanningRef.current) return;

    barcodeDetector
      .detect(videoRef.current)
      .then((barcodes) => {
        if (barcodes.length > 0) {
          const firstBarcode = barcodes[0];
          if (firstBarcode) {
            onScan(firstBarcode.rawValue);
            stopScanning();
            return;
          }
        }
        if (isScanningRef.current) {
          requestAnimationFrame(detectBarcode);
        }
      })
      .catch((err) => {
        console.warn("Barcode detection failed:", err);
        if (isScanningRef.current) {
          requestAnimationFrame(detectBarcode);
        }
      });
  }
  detectBarcode();
}
