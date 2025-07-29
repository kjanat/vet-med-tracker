"use client";

import { useCallback, useRef, useState } from "react";

interface BarcodeScannerOptions {
	onScan: (barcode: string) => void;
	onError: (error: string) => void;
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
					videoRef.current.srcObject = stream;
					videoRef.current.play();

					const barcodeDetector = new (window as any).BarcodeDetector();

					const detectBarcode = async () => {
						if (videoRef.current && isScanningRef.current) {
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

							if (isScanningRef.current) {
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
	}, [onScan, onError, stopScanning]);

	return {
		isScanning,
		hasPermission,
		videoRef,
		startScanning,
		stopScanning,
	};
}
