/**
 * Client-side image compression utilities
 * Uses Canvas API to resize and compress images before upload
 */

export interface CompressionOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	targetSizeKB?: number;
	format?: "image/jpeg" | "image/png" | "image/webp";
}

export interface CompressionResult {
	file: File;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	dimensions: {
		original: { width: number; height: number };
		compressed: { width: number; height: number };
	};
}

/**
 * Default compression settings for animal photos
 */
export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
	maxWidth: 1200,
	maxHeight: 1200,
	quality: 0.8,
	targetSizeKB: 500,
	format: "image/jpeg",
};

/**
 * Load image from file and get dimensions
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number,
): { width: number; height: number } {
	const aspectRatio = originalWidth / originalHeight;

	let newWidth = originalWidth;
	let newHeight = originalHeight;

	// Resize based on max width
	if (newWidth > maxWidth) {
		newWidth = maxWidth;
		newHeight = newWidth / aspectRatio;
	}

	// Resize based on max height
	if (newHeight > maxHeight) {
		newHeight = maxHeight;
		newWidth = newHeight * aspectRatio;
	}

	return {
		width: Math.round(newWidth),
		height: Math.round(newHeight),
	};
}

/**
 * Compress image using canvas
 */
function compressImageWithCanvas(
	img: HTMLImageElement,
	options: Required<CompressionOptions>,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		try {
			// Calculate new dimensions
			const { width, height } = calculateDimensions(
				img.naturalWidth,
				img.naturalHeight,
				options.maxWidth,
				options.maxHeight,
			);

			// Create canvas
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			canvas.width = width;
			canvas.height = height;

			// Set high-quality rendering
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = "high";

			// Draw and compress
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to compress image"));
					}
				},
				options.format,
				options.quality,
			);
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Iteratively compress image to meet target size
 */
async function compressToTargetSize(
	img: HTMLImageElement,
	options: Required<CompressionOptions>,
): Promise<Blob> {
	let quality = options.quality;
	let blob = await compressImageWithCanvas(img, { ...options, quality });

	// If already under target size, return
	const targetSizeBytes = options.targetSizeKB * 1024;
	if (blob.size <= targetSizeBytes) {
		return blob;
	}

	// Iteratively reduce quality to meet target size
	const maxIterations = 8;
	let iteration = 0;

	while (
		blob.size > targetSizeBytes &&
		iteration < maxIterations &&
		quality > 0.1
	) {
		quality = Math.max(0.1, quality * 0.8); // Reduce quality by 20% each iteration
		blob = await compressImageWithCanvas(img, { ...options, quality });
		iteration++;
	}

	// If still too large, try reducing dimensions
	if (blob.size > targetSizeBytes) {
		const scaleFactor = Math.sqrt(targetSizeBytes / blob.size);
		const newMaxWidth = Math.round(options.maxWidth * scaleFactor);
		const newMaxHeight = Math.round(options.maxHeight * scaleFactor);

		blob = await compressImageWithCanvas(img, {
			...options,
			maxWidth: newMaxWidth,
			maxHeight: newMaxHeight,
			quality: 0.7, // Use reasonable quality for smaller images
		});
	}

	return blob;
}

/**
 * Main compression function
 */
export async function compressImage(
	file: File,
	options: CompressionOptions = {},
): Promise<CompressionResult> {
	// Validate input
	if (!file.type.startsWith("image/")) {
		throw new Error("File must be an image");
	}

	// Merge options with defaults
	const finalOptions: Required<CompressionOptions> = {
		maxWidth: options.maxWidth ?? DEFAULT_COMPRESSION_OPTIONS.maxWidth!,
		maxHeight: options.maxHeight ?? DEFAULT_COMPRESSION_OPTIONS.maxHeight!,
		quality: options.quality ?? DEFAULT_COMPRESSION_OPTIONS.quality!,
		targetSizeKB:
			options.targetSizeKB ?? DEFAULT_COMPRESSION_OPTIONS.targetSizeKB!,
		format: options.format ?? DEFAULT_COMPRESSION_OPTIONS.format!,
	};

	try {
		// Load original image
		const img = await loadImageFromFile(file);
		const originalDimensions = {
			width: img.naturalWidth,
			height: img.naturalHeight,
		};

		// Compress image
		const compressedBlob = await compressToTargetSize(img, finalOptions);

		// Calculate compressed dimensions
		const compressedDimensions = calculateDimensions(
			originalDimensions.width,
			originalDimensions.height,
			finalOptions.maxWidth,
			finalOptions.maxHeight,
		);

		// Create new file from compressed blob
		const compressedFile = new File(
			[compressedBlob],
			`${file.name.replace(/\.[^/.]+$/, "")}.jpg`, // Always use .jpg for compressed images
			{ type: finalOptions.format },
		);

		// Calculate compression metrics
		const compressionRatio = file.size / compressedFile.size;

		// Clean up object URL
		URL.revokeObjectURL(img.src);

		return {
			file: compressedFile,
			originalSize: file.size,
			compressedSize: compressedFile.size,
			compressionRatio,
			dimensions: {
				original: originalDimensions,
				compressed: compressedDimensions,
			},
		};
	} catch (error) {
		throw new Error(
			`Image compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if the browser supports required features
 */
export function isCompressionSupported(): boolean {
	if (typeof window === "undefined") return false;

	try {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		return !!(
			ctx &&
			canvas.toBlob &&
			window.File &&
			window.FileReader &&
			typeof canvas.toBlob === "function"
		);
	} catch {
		return false;
	}
}
