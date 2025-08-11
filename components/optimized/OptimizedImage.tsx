"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils/general";

interface OptimizedImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	priority?: boolean;
	fill?: boolean;
	sizes?: string;
	placeholder?: "blur" | "empty";
	blurDataURL?: string;
	onLoad?: () => void;
	onError?: () => void;
}

export function OptimizedImage({
	src,
	alt,
	width,
	height,
	className,
	priority = false,
	fill = false,
	sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
	placeholder,
	blurDataURL,
	onLoad,
	onError,
}: OptimizedImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const handleLoad = useCallback(() => {
		setIsLoading(false);
		onLoad?.();
	}, [onLoad]);

	const handleError = useCallback(() => {
		setIsLoading(false);
		setHasError(true);
		onError?.();
	}, [onError]);

	if (hasError) {
		return (
			<div
				className={cn(
					"flex items-center justify-center bg-muted text-muted-foreground",
					className,
				)}
				style={{ width, height }}
			>
				<span className="text-sm">Failed to load image</span>
			</div>
		);
	}

	return (
		<div className={cn("relative overflow-hidden", className)}>
			{isLoading && (
				<div
					className="absolute inset-0 animate-pulse bg-muted"
					style={{ width, height }}
				/>
			)}
			<Image
				src={src}
				alt={alt}
				width={fill ? undefined : width}
				height={fill ? undefined : height}
				fill={fill}
				sizes={sizes}
				priority={priority}
				placeholder={placeholder}
				blurDataURL={blurDataURL}
				onLoad={handleLoad}
				onError={handleError}
				className={cn(
					"transition-opacity duration-300",
					isLoading ? "opacity-0" : "opacity-100",
				)}
				style={{
					objectFit: "cover",
				}}
			/>
		</div>
	);
}

// Avatar-specific optimized image
export function OptimizedAvatar({
	src,
	alt,
	size = 40,
	className,
	fallback,
}: {
	src?: string;
	alt: string;
	size?: number;
	className?: string;
	fallback?: React.ReactNode;
}) {
	const [hasError, setHasError] = useState(false);

	if (!src || hasError) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-full bg-muted text-muted-foreground",
					className,
				)}
				style={{ width: size, height: size }}
			>
				{fallback || (
					<span className="text-xs">{alt.charAt(0).toUpperCase()}</span>
				)}
			</div>
		);
	}

	return (
		<OptimizedImage
			src={src}
			alt={alt}
			width={size}
			height={size}
			className={cn("rounded-full", className)}
			sizes={`${size}px`}
			onError={() => setHasError(true)}
		/>
	);
}

// Photo gallery optimized image
export function OptimizedPhotoGalleryImage({
	src,
	alt,
	className,
	onClick,
}: {
	src: string;
	alt: string;
	className?: string;
	onClick?: () => void;
}) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if ((e.key === "Enter" || e.key === " ") && onClick) {
			e.preventDefault();
			onClick();
		}
	};

	return (
		<button
			type="button"
			className={cn("cursor-pointer", className)}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			aria-label="Open image in full view"
		>
			<OptimizedImage
				src={src}
				alt={alt}
				width={300}
				height={200}
				sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
				placeholder="blur"
				blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
				className="rounded-lg"
			/>
		</button>
	);
}
