"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface SilhouetteIndex {
	totalImages: number;
	animals: Record<string, string[]>;
}

export function AnimalSilhouettes() {
	const [selectedImages, setSelectedImages] = useState<string[]>([]);

	useEffect(() => {
		// Fetch the index and select a random subset of images
		fetch("/silhouettes/index.json")
			.then((res) => res.json())
			.then((index: SilhouetteIndex) => {
				// Get 2-3 images from each animal type
				const selected: string[] = [];
				for (const [_animalType, images] of Object.entries(index.animals)) {
					// Shuffle and take first 2-3 images
					const shuffled = [...images].sort(() => Math.random() - 0.5);
					selected.push(...shuffled.slice(0, Math.min(3, images.length)));
				}

				// Shuffle the final selection and take 12 images
				const finalSelection = [...selected]
					.sort(() => Math.random() - 0.5)
					.slice(0, 12);

				setSelectedImages(finalSelection);
			})
			.catch((error) => {
				console.error("Failed to load animal silhouettes:", error);
				// Fallback to empty array
				setSelectedImages([]);
			});
	}, []);

	if (selectedImages.length === 0) {
		return null;
	}

	// Duplicate the images for seamless scrolling
	const duplicatedImages = [...selectedImages, ...selectedImages];

	return (
		<div className="-mx-4 pointer-events-none mt-8 touch-none select-none overflow-hidden">
			<div className="flex animate-scroll gap-12 opacity-5">
				{duplicatedImages.map((imageName, index) => (
					<Image
						key={`${imageName.split(".")[0]}-${Math.floor(index / selectedImages.length)}`}
						src={`/silhouettes/${imageName}`}
						alt=""
						width={96}
						height={96}
						className="h-24 w-24 flex-shrink-0 dark:invert"
						aria-hidden="true"
						unoptimized
					/>
				))}
			</div>
		</div>
	);
}
