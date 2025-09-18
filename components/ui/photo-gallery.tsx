"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  ImageIcon,
  MoreHorizontal,
  RotateCcw,
  Star,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LazyImage, ProgressiveImage } from "@/components/ui/progressive-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils/general";

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  isPrimary?: boolean;
  uploadedAt?: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoDelete?: (photoId: string) => Promise<void>;
  onPhotoPrimary?: (photoId: string) => Promise<void>;
  onPhotoReorder?: (photoIds: string[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  maxColumns?: number;
  showCaptions?: boolean;
  enableLazyLoading?: boolean;
  enableSwipeGestures?: boolean;
  allowDelete?: boolean;
  allowSetPrimary?: boolean;
  allowReorder?: boolean;
}

interface LightboxState {
  isOpen: boolean;
  currentIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  lastPanX: number;
  lastPanY: number;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  threshold: number;
}

interface TouchState {
  initialDistance: number;
  initialZoom: number;
  touches: number;
}

/**
 * PhotoGallery - A comprehensive photo gallery component with lightbox,
 * swipe gestures, lazy loading, and photo management features
 */
export function PhotoGallery({
  photos = [],
  onPhotoDelete,
  onPhotoPrimary,
  onPhotoReorder: _onPhotoReorder,
  isLoading = false,
  className,
  maxColumns = 4,
  showCaptions = true,
  enableLazyLoading = true,
  enableSwipeGestures = true,
  allowDelete = false,
  allowSetPrimary = false,
  allowReorder: _allowReorder = false,
}: PhotoGalleryProps) {
  const { toast } = useToast();

  // Lightbox state
  const [lightbox, setLightbox] = useState<LightboxState>({
    currentIndex: 0,
    isDragging: false,
    isOpen: false,
    lastPanX: 0,
    lastPanY: 0,
    panX: 0,
    panY: 0,
    zoom: 1,
  });

  // Touch/swipe state
  const [swipe, setSwipe] = useState<SwipeState>({
    currentX: 0,
    currentY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    threshold: 50,
  });

  const [touch, setTouch] = useState<TouchState>({
    initialDistance: 0,
    initialZoom: 1,
    touches: 0,
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    photoId: string | null;
    photoUrl: string | null;
  }>({
    isOpen: false,
    photoId: null,
    photoUrl: null,
  });

  // Refs
  const lightboxImageRef = useRef<HTMLImageElement>(null);
  const lightboxContentRef = useRef<HTMLDivElement>(null);
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const [visiblePhotos, setVisiblePhotos] = useState<Set<string>>(new Set());

  // Initialize intersection observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoading) return;

    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const photoId = entry.target.getAttribute("data-photo-id");
            if (photoId) {
              setVisiblePhotos((prev) => new Set([...prev, photoId]));
              intersectionObserver.current?.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
      },
    );

    return () => {
      intersectionObserver.current?.disconnect();
    };
  }, [enableLazyLoading]);

  /**
   * Open lightbox at specific photo index
   */
  const openLightbox = useCallback((index: number) => {
    setLightbox({
      currentIndex: index,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    });
  }, []);

  /**
   * Close lightbox
   */
  const closeLightbox = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      isDragging: false,
      isOpen: false,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    }));
  }, []);

  /**
   * Navigate to next/previous photo
   */
  const navigatePhoto = useCallback(
    (direction: number) => {
      setLightbox((prev) => {
        const newIndex = prev.currentIndex + direction;
        if (newIndex < 0 || newIndex >= photos.length) return prev;

        return {
          ...prev,
          currentIndex: newIndex,
          panX: 0,
          panY: 0,
          zoom: 1,
        };
      });
    },
    [photos.length],
  );

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.5, 5),
    }));
  }, []);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      panX: prev.zoom <= 1 ? 0 : prev.panX,
      panY: prev.zoom <= 1 ? 0 : prev.panY,
      zoom: Math.max(prev.zoom / 1.5, 0.5),
    }));
  }, []);

  /**
   * Reset zoom
   */
  const resetZoom = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: 1,
    }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          navigatePhoto(-1);
          break;
        case "ArrowRight":
          navigatePhoto(1);
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    lightbox.isOpen,
    closeLightbox,
    navigatePhoto,
    resetZoom,
    zoomIn,
    zoomOut,
  ]);

  /**
   * Handle touch start for swipe gestures
   */
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enableSwipeGestures || !lightbox.isOpen) return;

      const touches = event.touches;

      if (touches.length === 1) {
        // Single touch - swipe or pan
        const touch = touches[0];
        if (!touch) return;

        setSwipe({
          currentX: touch.clientX,
          currentY: touch.clientY,
          isDragging: true,
          startX: touch.clientX,
          startY: touch.clientY,
          threshold: 50,
        });

        setLightbox((prev) => ({
          ...prev,
          isDragging: true,
          lastPanX: prev.panX,
          lastPanY: prev.panY,
        }));
      } else if (touches.length === 2) {
        // Two touch - pinch to zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        if (!touch1 || !touch2) return;

        const distance = Math.sqrt(
          (touch1.clientX - touch2.clientX) ** 2 +
            (touch1.clientY - touch2.clientY) ** 2,
        );

        setTouch({
          initialDistance: distance,
          initialZoom: lightbox.zoom,
          touches: 2,
        });
      }
    },
    [enableSwipeGestures, lightbox.isOpen, lightbox.zoom],
  );

  // Helper to handle single touch pan/swipe
  const handleSingleTouchMove = useCallback(
    (touch: React.Touch, deltaX: number, deltaY: number) => {
      setSwipe((prev) => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }));

      if (lightbox.zoom > 1) {
        // Pan the zoomed image
        setLightbox((prev) => ({
          ...prev,
          panX: prev.lastPanX + deltaX,
          panY: prev.lastPanY + deltaY,
        }));
      }
    },
    [lightbox.zoom],
  );

  // Helper to calculate distance between two touches
  const calculateTouchDistance = useCallback(
    (touch1: React.Touch, touch2: React.Touch) =>
      Math.sqrt(
        (touch1.clientX - touch2.clientX) ** 2 +
          (touch1.clientY - touch2.clientY) ** 2,
      ),
    [],
  );

  // Helper to handle pinch to zoom
  const handlePinchZoom = useCallback(
    (touch1: React.Touch, touch2: React.Touch) => {
      const distance = calculateTouchDistance(touch1, touch2);
      const scale = distance / touch.initialDistance;
      const newZoom = Math.min(Math.max(touch.initialZoom * scale, 0.5), 5);

      setLightbox((prev) => ({
        ...prev,
        zoom: newZoom,
      }));
    },
    [calculateTouchDistance, touch.initialDistance, touch.initialZoom],
  );

  /**
   * Handle touch move for swipe gestures and panning
   */
  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!enableSwipeGestures || !lightbox.isOpen) return;

      event.preventDefault();
      const touches = event.touches;

      if (touches.length === 1 && swipe.isDragging) {
        const touch = touches[0];
        if (!touch) return;

        const deltaX = touch.clientX - swipe.startX;
        const deltaY = touch.clientY - swipe.startY;

        handleSingleTouchMove(touch, deltaX, deltaY);
      } else if (touches.length === 2) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        if (!touch1 || !touch2) return;

        handlePinchZoom(touch1, touch2);
      }
    },
    [
      enableSwipeGestures,
      lightbox.isOpen,
      swipe.isDragging,
      swipe.startX,
      swipe.startY,
      handleSingleTouchMove,
      handlePinchZoom,
    ],
  );

  /**
   * Handle touch end for swipe gestures
   */
  const handleTouchEnd = useCallback(() => {
    if (!enableSwipeGestures || !lightbox.isOpen || !swipe.isDragging) return;

    const deltaX = swipe.currentX - swipe.startX;
    const deltaY = swipe.currentY - swipe.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger swipe if horizontal movement is dominant and exceeds threshold
    if (
      absDeltaX > absDeltaY &&
      absDeltaX > swipe.threshold &&
      lightbox.zoom <= 1
    ) {
      if (deltaX > 0) {
        navigatePhoto(-1); // Swipe right = previous
      } else {
        navigatePhoto(1); // Swipe left = next
      }
    }

    setSwipe((prev) => ({
      ...prev,
      isDragging: false,
    }));

    setLightbox((prev) => ({
      ...prev,
      isDragging: false,
    }));

    setTouch({
      initialDistance: 0,
      initialZoom: 1,
      touches: 0,
    });
  }, [
    enableSwipeGestures,
    lightbox.isOpen,
    lightbox.zoom,
    swipe.isDragging,
    swipe.currentX,
    swipe.startX,
    swipe.currentY,
    swipe.startY,
    swipe.threshold,
    navigatePhoto,
  ]);

  /**
   * Handle photo deletion
   */
  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      try {
        await onPhotoDelete?.(photoId);
        setDeleteConfirm({
          isOpen: false,
          photoId: null,
          photoUrl: null,
        });

        // Close lightbox if the deleted photo was being viewed
        if (lightbox.isOpen && photos[lightbox.currentIndex]?.id === photoId) {
          closeLightbox();
        }

        toast({
          description: "The photo has been successfully deleted.",
          title: "Photo deleted",
        });
      } catch (error) {
        console.error("Error deleting photo:", error);
        toast({
          description: "Failed to delete photo. Please try again.",
          title: "Error",
          variant: "destructive",
        });
      }
    },
    [
      onPhotoDelete,
      lightbox.isOpen,
      lightbox.currentIndex,
      photos,
      closeLightbox,
      toast,
    ],
  );

  /**
   * Handle setting primary photo
   */
  const handleSetPrimary = useCallback(
    async (photoId: string) => {
      try {
        await onPhotoPrimary?.(photoId);
        toast({
          description: "The primary photo has been updated successfully.",
          title: "Primary photo updated",
        });
      } catch (error) {
        console.error("Error setting primary photo:", error);
        toast({
          description: "Failed to update primary photo. Please try again.",
          title: "Error",
          variant: "destructive",
        });
      }
    },
    [onPhotoPrimary, toast],
  );

  /**
   * Download photo
   */
  const handleDownloadPhoto = useCallback(
    async (photo: Photo) => {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading photo:", error);
        toast({
          description: "Failed to download photo. Please try again.",
          title: "Error",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  // Get grid columns class based on maxColumns
  const getGridColumns = useCallback(() => {
    switch (maxColumns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case 5:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    }
  }, [maxColumns]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Photos</h3>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className={cn("grid gap-4", getGridColumns())}>
          {Array.from({ length: 6 }).map(() => (
            <div className="space-y-2" key={crypto.randomUUID()}>
              <Skeleton className="aspect-square w-full rounded-lg" />
              {showCaptions && <Skeleton className="h-4 w-3/4" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Photos</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground text-sm">No photos yet</p>
          <p className="text-muted-foreground text-xs">
            Upload photos to create a gallery
          </p>
        </div>
      </div>
    );
  }

  const currentPhoto = lightbox.isOpen ? photos[lightbox.currentIndex] : null;

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Photos ({photos.length})</h3>
        </div>

        {/* Photo Grid */}
        <div className={cn("grid gap-4", getGridColumns())}>
          {photos.map((photo, index) => (
            <PhotoGridItem
              enableLazyLoading={enableLazyLoading}
              index={index}
              intersectionObserver={intersectionObserver.current}
              isVisible={visiblePhotos.has(photo.id)}
              key={photo.id}
              onDelete={
                allowDelete
                  ? (photoId) =>
                      setDeleteConfirm({
                        isOpen: true,
                        photoId,
                        photoUrl: photo.url,
                      })
                  : undefined
              }
              onOpenLightbox={openLightbox}
              onSetPrimary={allowSetPrimary ? handleSetPrimary : undefined}
              photo={photo}
              showCaption={showCaptions}
            />
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog onOpenChange={closeLightbox} open={lightbox.isOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="h-screen max-h-full w-screen max-w-full border-0 p-0"
        >
          <DialogHeader className="absolute top-4 left-4 z-10">
            <DialogTitle className="text-white">
              {currentPhoto?.caption ||
                `Photo ${lightbox.currentIndex + 1} of ${photos.length}`}
            </DialogTitle>
          </DialogHeader>

          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black"
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            ref={lightboxContentRef}
          >
            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <Button
                  className="-translate-y-1/2 absolute top-1/2 left-4 z-10 bg-black/50 text-white hover:bg-black/70"
                  disabled={lightbox.currentIndex === 0}
                  onClick={() => navigatePhoto(-1)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                <Button
                  className="-translate-y-1/2 absolute top-1/2 right-4 z-10 bg-black/50 text-white hover:bg-black/70"
                  disabled={lightbox.currentIndex === photos.length - 1}
                  onClick={() => navigatePhoto(1)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Zoom controls */}
            <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-10 flex items-center gap-2 rounded-lg bg-black/50 p-2">
              <Button
                className="text-white hover:bg-white/20"
                disabled={lightbox.zoom <= 0.5}
                onClick={zoomOut}
                size="sm"
                variant="ghost"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="min-w-[3rem] text-center text-sm text-white">
                {Math.round(lightbox.zoom * 100)}%
              </span>

              <Button
                className="text-white hover:bg-white/20"
                disabled={lightbox.zoom >= 5}
                onClick={zoomIn}
                size="sm"
                variant="ghost"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                className="text-white hover:bg-white/20"
                disabled={lightbox.zoom === 1}
                onClick={resetZoom}
                size="sm"
                variant="ghost"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Photo actions */}
            {currentPhoto && (
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="bg-black/50 text-white hover:bg-black/70"
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDownloadPhoto(currentPhoto)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>

                    {allowSetPrimary && !currentPhoto.isPrimary && (
                      <DropdownMenuItem
                        onClick={() => handleSetPrimary(currentPhoto.id)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Set as primary
                      </DropdownMenuItem>
                    )}

                    {allowDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              photoId: currentPhoto.id,
                              photoUrl: currentPhoto.url,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Main image */}
            {currentPhoto && (
              <Image
                alt={
                  currentPhoto.caption || `Photo ${lightbox.currentIndex + 1}`
                }
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                draggable={false}
                fill
                ref={lightboxImageRef}
                sizes="100vw"
                src={currentPhoto.url}
                style={{
                  cursor: lightbox.zoom > 1 ? "grab" : "default",
                  transform: `scale(${lightbox.zoom}) translate(${lightbox.panX}px, ${lightbox.panY}px)`,
                }}
                unoptimized
              />
            )}

            {/* Photo counter */}
            {photos.length > 1 && (
              <div className="absolute right-4 bottom-4 z-10 rounded bg-black/50 px-3 py-1 text-sm text-white">
                {lightbox.currentIndex + 1} of {photos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        onOpenChange={(open) =>
          setDeleteConfirm((prev) => ({ ...prev, isOpen: open }))
        }
        open={deleteConfirm.isOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteConfirm.photoId &&
                handleDeletePhoto(deleteConfirm.photoId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Individual photo grid item component
 */
interface PhotoGridItemProps {
  photo: Photo;
  index: number;
  onOpenLightbox: (index: number) => void;
  onDelete?: (photoId: string) => void;
  onSetPrimary?: (photoId: string) => void;
  showCaption?: boolean;
  enableLazyLoading?: boolean;
  intersectionObserver?: IntersectionObserver | null;
  isVisible?: boolean;
}

function PhotoGridItem({
  photo,
  index,
  onOpenLightbox,
  onDelete,
  onSetPrimary,
  showCaption = true,
  enableLazyLoading = true,
  intersectionObserver,
  isVisible = false,
}: PhotoGridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (enableLazyLoading && intersectionObserver && itemRef.current) {
      const currentItem = itemRef.current;
      currentItem.setAttribute("data-photo-id", photo.id);
      intersectionObserver.observe(currentItem);

      return () => {
        if (currentItem) {
          intersectionObserver.unobserve(currentItem);
        }
      };
    }
  }, [enableLazyLoading, intersectionObserver, photo.id]);

  const showImage = !enableLazyLoading || isVisible;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenLightbox(index);
    }
  };

  return (
    <div className="group relative" ref={itemRef}>
      {/* Photo container */}
      <button
        aria-label={`Open photo ${index + 1} in lightbox`}
        className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted transition-all duration-200 hover:ring-2 hover:ring-primary hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        onClick={() => onOpenLightbox(index)}
        onKeyDown={handleKeyDown}
        type="button"
      >
        {/* Primary indicator */}
        {photo.isPrimary && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded bg-primary/90 px-2 py-1 font-medium text-primary-foreground text-xs">
            <Heart className="h-3 w-3 fill-current" />
            Primary
          </div>
        )}

        {/* Action buttons */}
        {(onDelete || onSetPrimary) && (
          <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                  size="sm"
                  variant="secondary"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSetPrimary && !photo.isPrimary && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPrimary(photo.id);
                    }}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Set as primary
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <>
                    {onSetPrimary && !photo.isPrimary && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(photo.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Image */}
        {showImage ? (
          enableLazyLoading ? (
            <LazyImage
              alt={photo.caption || `Image ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              height={400}
              src={photo.thumbnailUrl || photo.url}
              width={400}
            />
          ) : (
            <ProgressiveImage
              alt={photo.caption || `Image ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              height={400}
              src={photo.thumbnailUrl || photo.url}
              width={400}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </button>

      {/* Caption */}
      {showCaption && photo.caption && (
        <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
          {photo.caption}
        </p>
      )}
    </div>
  );
}
