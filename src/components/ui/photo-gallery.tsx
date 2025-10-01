"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { Button } from "@/components/app/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/general";

export interface Photo {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  className?: string;
  thumbnailSize?: "sm" | "md" | "lg";
}

export function PhotoGallery({
  photos,
  className,
  thumbnailSize = "md",
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const getThumbnailSize = () => {
    switch (thumbnailSize) {
      case "sm":
        return "w-16 h-16";
      case "lg":
        return "w-32 h-32";
      default:
        return "w-24 h-24";
    }
  };

  const openModal = (index: number) => {
    setSelectedIndex(index);
  };

  const closeModal = () => {
    setSelectedIndex(null);
  };

  const navigateToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const navigateToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (selectedIndex === null) return;

      switch (event.key) {
        case "ArrowRight":
          if (selectedIndex < photos.length - 1) {
            setSelectedIndex(selectedIndex + 1);
          }
          break;
        case "ArrowLeft":
          if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
          }
          break;
        case "Escape":
          setSelectedIndex(null);
          break;
      }
    },
    [selectedIndex, photos.length],
  );

  React.useEffect(() => {
    if (selectedIndex !== null) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, selectedIndex]);

  if (photos.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No photos available
      </div>
    );
  }

  return (
    <>
      <div className={cn("grid gap-2", className)}>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo, index) => (
            <button
              className={cn(
                "relative overflow-hidden rounded-md transition-opacity hover:opacity-80",
                getThumbnailSize(),
              )}
              key={photo.id}
              onClick={() => openModal(index)}
              type="button"
            >
              <Image
                alt={photo.alt || `Photo ${index + 1}`}
                className="object-cover"
                fill
                sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                src={photo.url}
              />
            </button>
          ))}
        </div>
      </div>

      <Dialog onOpenChange={closeModal} open={selectedIndex !== null}>
        <DialogContent className="w-full max-w-4xl">
          {selectedIndex !== null && (
            <div className="relative">
              <div className="relative aspect-video w-full">
                <Image
                  alt={
                    photos[selectedIndex]?.alt || `Photo ${selectedIndex + 1}`
                  }
                  className="object-contain"
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  src={photos[selectedIndex]?.url || ""}
                />
              </div>

              {/* Navigation buttons */}
              {photos.length > 1 && (
                <>
                  <Button
                    className="-translate-y-1/2 absolute top-1/2 left-2"
                    disabled={selectedIndex === 0}
                    onClick={navigateToPrevious}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    className="-translate-y-1/2 absolute top-1/2 right-2"
                    disabled={selectedIndex === photos.length - 1}
                    onClick={navigateToNext}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Caption */}
              {photos[selectedIndex]?.caption && (
                <div className="mt-4 text-center text-muted-foreground text-sm">
                  {photos[selectedIndex]?.caption}
                </div>
              )}

              {/* Counter */}
              {photos.length > 1 && (
                <div className="mt-2 text-center text-muted-foreground text-xs">
                  {selectedIndex + 1} of {photos.length}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
