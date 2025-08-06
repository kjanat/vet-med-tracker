"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface SilhouetteIndex {
	totalImages: number;
	animals: Record<string, string[]>;
}

// Simple hash function for deterministic randomness
function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
	return () => {
		const x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	};
}

export function AnimalSilhouettes() {
	const [allImages, setAllImages] = useState<string[]>([]);
	const [isReady, setIsReady] = useState(false);
	const [visibleRange, setVisibleRange] = useState({ start: -1, end: 20 });
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const animationRef = useRef<number>();
	const isDraggingRef = useRef(false);
	const scrollPositionRef = useRef(0);
	const dragStartXRef = useRef(0);
	const dragOffsetRef = useRef(0);
	const velocityRef = useRef(0);
	const lastXRef = useRef(0);
	const lastTimeRef = useRef(0);
	const sessionSeedRef = useRef(0);
	const imageWidthRef = useRef(144); // 96px + 48px gap

	// Load all available images and generate session seed
	useEffect(() => {
		// Generate a unique seed for this page load
		sessionSeedRef.current = hashCode(`${Date.now()}-${Math.random()}`);

		fetch("/silhouettes/index.json")
			.then((res) => res.json())
			.then((index: SilhouetteIndex) => {
				const all: string[] = [];
				for (const images of Object.values(index.animals)) {
					all.push(...images);
				}
				setAllImages(all);
				setIsReady(true);
			})
			.catch((error) => {
				console.error("Failed to load animal silhouettes:", error);
				setAllImages([]);
			});
	}, []);

	// Get image at any index using deterministic hash
	const getImageAtIndex = (index: number): string | null => {
		if (allImages.length === 0) return null;

		// Use hash to deterministically select image for this index
		const seed = sessionSeedRef.current + index;
		const random = seededRandom(seed);
		const imageIndex = Math.floor(random() * allImages.length);
		return allImages[imageIndex];
	};

	// Update visible range based on scroll position
	const updateVisibleRange = useCallback(() => {
		const containerWidth = 1920; // Assume max width
		const totalOffset = scrollPositionRef.current - dragOffsetRef.current;
		const startIndex = Math.floor(totalOffset / imageWidthRef.current) - 2;
		const visibleCount = Math.ceil(containerWidth / imageWidthRef.current) + 4;
		const endIndex = startIndex + visibleCount;

		setVisibleRange((prev) => {
			// Only update if range has changed significantly
			if (
				Math.abs(prev.start - startIndex) > 1 ||
				Math.abs(prev.end - endIndex) > 1
			) {
				return { start: startIndex, end: endIndex };
			}
			return prev;
		});
	}, []);

	// Animation loop - runs outside React's render cycle for smoothness
	useEffect(() => {
		if (!isReady || !scrollerRef.current) return;

		let lastFrameTime = performance.now();
		const baseSpeed = 30; // pixels per second
		let frameCount = 0;

		const animate = (currentTime: number) => {
			const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
			lastFrameTime = currentTime;

			if (!isDraggingRef.current) {
				// Auto-scroll when not dragging
				scrollPositionRef.current += baseSpeed * deltaTime;
			}

			// Apply the transform directly to the DOM element
			if (scrollerRef.current) {
				const offset = -scrollPositionRef.current + dragOffsetRef.current;
				scrollerRef.current.style.transform = `translateX(${offset}px)`;
			}

			// Update visible range every 10 frames to avoid too many re-renders
			frameCount++;
			if (frameCount % 10 === 0) {
				updateVisibleRange();
			}

			animationRef.current = requestAnimationFrame(animate);
		};

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, [isReady, updateVisibleRange]);

	// Handle drag start
	const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
		isDraggingRef.current = true;
		const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
		dragStartXRef.current = clientX - dragOffsetRef.current;
		lastXRef.current = clientX;
		lastTimeRef.current = performance.now();
		velocityRef.current = 0;

		e.preventDefault();
	};

	// Handle drag interactions
	useEffect(() => {
		const handleMove = (e: MouseEvent | TouchEvent) => {
			if (!isDraggingRef.current) return;

			const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
			const currentTime = performance.now();
			const deltaTime = currentTime - lastTimeRef.current;

			// Calculate velocity for momentum
			if (deltaTime > 0) {
				velocityRef.current = ((clientX - lastXRef.current) / deltaTime) * 1000; // pixels per second
			}

			dragOffsetRef.current = clientX - dragStartXRef.current;
			lastXRef.current = clientX;
			lastTimeRef.current = currentTime;

			// Update visible range immediately when dragging
			updateVisibleRange();
		};

		const handleEnd = () => {
			if (!isDraggingRef.current) return;
			isDraggingRef.current = false;

			// Commit the drag offset to the scroll position
			scrollPositionRef.current -= dragOffsetRef.current;
			dragOffsetRef.current = 0;

			// Apply momentum like a slot machine
			let velocity = velocityRef.current;

			const applyMomentum = () => {
				// Apply friction to slow down the velocity
				velocity *= 0.95;

				// Add velocity to scroll position (like a spinning slot machine)
				scrollPositionRef.current -= velocity * 0.016; // Assume 60fps (16ms per frame)

				// Update visible range as we coast
				updateVisibleRange();

				// Continue if still moving significantly
				if (Math.abs(velocity) > 0.5) {
					requestAnimationFrame(applyMomentum);
				}
			};

			// Start the momentum animation if there's velocity
			if (Math.abs(velocity) > 0.5) {
				requestAnimationFrame(applyMomentum);
			}
		};

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleEnd);
		window.addEventListener("touchmove", handleMove, { passive: false });
		window.addEventListener("touchend", handleEnd);

		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleEnd);
			window.removeEventListener("touchmove", handleMove);
			window.removeEventListener("touchend", handleEnd);
		};
	}, [updateVisibleRange]);

	if (!isReady) {
		return null;
	}

	// Generate visible images based on current visible range
	const visibleImages = [];
	for (let i = visibleRange.start; i <= visibleRange.end; i++) {
		const image = getImageAtIndex(i);
		if (image) {
			visibleImages.push({
				index: i,
				src: image,
				x: i * imageWidthRef.current,
			});
		}
	}

	return (
		<div
			ref={containerRef}
			className="-mx-4 mask-alpha relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8rem,black_calc(100%-8rem),transparent)]"
			aria-hidden="true"
			role="presentation"
			onMouseDown={handleDragStart}
			onTouchStart={handleDragStart}
			style={{
				cursor: isDraggingRef.current ? "grabbing" : "grab",
				height: "96px", // Fixed height
			}}
		>
			<div
				ref={scrollerRef}
				className="relative opacity-5 will-change-transform"
				style={{
					height: "96px",
				}}
			>
				{visibleImages.map((item) => (
					<Image
						key={`img-${item.index}`}
						src={`/silhouettes/${item.src}`}
						alt=""
						width={96}
						height={96}
						className="absolute h-24 w-24 dark:invert"
						style={{
							left: `${item.x}px`,
							top: 0,
						}}
						aria-hidden="true"
						priority={false}
						unoptimized
					/>
				))}
			</div>
		</div>
	);
}
