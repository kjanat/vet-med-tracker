"use client";

import { useState, useRef, useCallback } from "react";

interface BarcodeScannerOptions {
	onScan: (barcode: string) => void;
	onError: (error: string) => void;
}

export function useBarcodeScanner({ onScan, onError }: BarcodeScannerOptions) {
	const [isScanning, setIsScanning] = useState(false);
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const startScanning = useCallback(async () => {
		try {
			setIsScanning(true);

			// Check if BarcodeDetector is available
			if ("BarcodeDetector" in window) {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
				});

				streamRef.current = stream;
				setHasPermission(true);

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					videoRef.current.play();

					const barcodeDetector = new (window as any).BarcodeDetector();

					const detectBarcode = async () => {
						if (videoRef.current && isScanning) {
							try {
								const barcodes = await barcodeDetector.detect(videoRef.current);
								if (barcodes.length > 0) {
									onScan(barcodes[0].rawValue);
									stopScanning();
									return;
								}
							} catch (err) {
								console.warn("Barcode detection failed:", err);
							}

							if (isScanning) {
								requestAnimationFrame(detectBarcode);
							}
						}
					};

					detectBarcode();
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
	}, [isScanning, onScan, onError]);

	const stopScanning = useCallback(() => {
		setIsScanning(false);

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}

		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, []);

	return {
		isScanning,
		hasPermission,
		videoRef,
		startScanning,
		stopScanning,
	};
}
