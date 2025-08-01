"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface ProgressiveImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	priority?: boolean;
	placeholder?: "blur" | "empty";
	blurDataURL?: string;
	onLoad?: () => void;
	fallback?: React.ReactNode;
}

/**
 * Progressive image component with loading states
 */
export function ProgressiveImage({
	src,
	alt,
	width,
	height,
	className,
	priority = false,
	placeholder,
	blurDataURL,
	onLoad,
	fallback,
}: ProgressiveImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const handleLoad = () => {
		setIsLoading(false);
		onLoad?.();
	};

	const handleError = () => {
		setIsLoading(false);
		setHasError(true);
	};

	if (hasError && fallback) {
		return <>{fallback}</>;
	}

	return (
		<div className={cn("relative overflow-hidden", className)}>
			{isLoading && (
				<Skeleton className="absolute inset-0 z-10" />
			)}
			
			<Image
				src={src}
				alt={alt}
				width={width}
				height={height}
				className={cn(
					"transition-opacity duration-300",
					isLoading ? "opacity-0" : "opacity-100",
					className,
				)}
				priority={priority}
				placeholder={placeholder}
				blurDataURL={blurDataURL}
				onLoad={handleLoad}
				onError={handleError}
			/>
		</div>
	);
}

/**
 * Avatar with progressive loading
 */
export function ProgressiveAvatar({
	src,
	alt,
	size = 40,
	className,
}: {
	src?: string | null;
	alt: string;
	size?: number;
	className?: string;
}) {
	const [imageError, setImageError] = useState(false);

	if (!src || imageError) {
		// Fallback to initials
		const initials = alt
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
					className,
				)}
				style={{ width: size, height: size, fontSize: size * 0.4 }}
			>
				{initials}
			</div>
		);
	}

	return (
		<ProgressiveImage
			src={src}
			alt={alt}
			width={size}
			height={size}
			className={cn("rounded-full", className)}
			onLoad={() => setImageError(false)}
			fallback={
				<div
					className={cn(
						"flex items-center justify-center rounded-full bg-muted",
						className,
					)}
					style={{ width: size, height: size }}
				/>
			}
		/>
	);
}

/**
 * Lazy load images that are not immediately visible
 */
export function LazyImage({
	src,
	alt,
	width,
	height,
	className,
	threshold = 0.1,
}: ProgressiveImageProps & { threshold?: number }) {
	const [isInView, setIsInView] = useState(false);
	const [ref, setRef] = useState<HTMLDivElement | null>(null);

	// Intersection observer to detect when image comes into view
	useState(() => {
		if (!ref || isInView) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setIsInView(true);
					observer.disconnect();
				}
			},
			{ threshold },
		);

		observer.observe(ref);

		return () => observer.disconnect();
	});

	return (
		<div ref={setRef} className={cn("relative", className)}>
			{!isInView ? (
				<Skeleton
					className="w-full h-full"
					style={{ width, height }}
				/>
			) : (
				<ProgressiveImage
					src={src}
					alt={alt}
					width={width}
					height={height}
					className={className}
				/>
			)}
		</div>
	);
}