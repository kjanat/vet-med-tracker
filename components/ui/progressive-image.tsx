"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/general";
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
      {isLoading && <Skeleton className="absolute inset-0 z-10" />}

      <Image
        alt={alt}
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className,
        )}
        height={height}
        onError={handleError}
        onLoad={handleLoad}
        placeholder={placeholder}
        priority={priority}
        src={src}
        width={width}
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
          "flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
          className,
        )}
        style={{ fontSize: size * 0.4, height: size, width: size }}
      >
        {initials}
      </div>
    );
  }

  return (
    <ProgressiveImage
      alt={alt}
      className={cn("rounded-full", className)}
      fallback={
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted",
            className,
          )}
          style={{ height: size, width: size }}
        />
      }
      height={size}
      onLoad={() => setImageError(false)}
      src={src}
      width={size}
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
  useEffect(() => {
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
  }, [ref, isInView, threshold]);

  return (
    <div className={cn("relative", className)} ref={setRef}>
      {!isInView ? (
        <Skeleton className="h-full w-full" style={{ height, width }} />
      ) : (
        <ProgressiveImage
          alt={alt}
          className={className}
          height={height}
          src={src}
          width={width}
        />
      )}
    </div>
  );
}
