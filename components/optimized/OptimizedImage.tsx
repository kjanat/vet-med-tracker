"use client";

import Image from "next/image";
import type React from "react";
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
        style={{ height, width }}
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
          style={{ height, width }}
        />
      )}
      <Image
        alt={alt}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
        )}
        fill={fill}
        height={fill ? undefined : height}
        onError={handleError}
        onLoad={handleLoad}
        placeholder={placeholder}
        priority={priority}
        sizes={sizes}
        src={src}
        style={{
          objectFit: "cover",
        }}
        width={fill ? undefined : width}
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
        style={{ height: size, width: size }}
      >
        {fallback || (
          <span className="text-xs">{alt.charAt(0).toUpperCase()}</span>
        )}
      </div>
    );
  }

  return (
    <OptimizedImage
      alt={alt}
      className={cn("rounded-full", className)}
      height={size}
      onError={() => setHasError(true)}
      sizes={`${size}px`}
      src={src}
      width={size}
    />
  );
}

// Photo gallery optimized image
export function OptimizedPhotoGalleryImage({
  src,
  alt,
  className,
  onClickAction,
}: {
  src: string;
  alt: string;
  className?: string;
  onClickAction?: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onClickAction) {
      e.preventDefault();
      onClickAction();
    }
  };

  return (
    <button
      aria-label="Open image in full view"
      className={cn("cursor-pointer", className)}
      onClick={onClickAction}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <OptimizedImage
        alt={alt}
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        className="rounded-lg"
        height={200}
        placeholder="blur"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
        src={src}
        width={300}
      />
    </button>
  );
}
