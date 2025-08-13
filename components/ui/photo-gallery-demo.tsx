"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type Photo, PhotoGallery } from "@/components/ui/photo-gallery";
import { Switch } from "@/components/ui/switch";

// Mock photo data for demonstration
const DEMO_PHOTOS: Photo[] = [
  {
    id: "1",
    url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
    caption: "Bella playing in the park",
    isPrimary: true,
    uploadedAt: new Date().toISOString(),
    size: 1024000,
    dimensions: { width: 800, height: 600 },
  },
  {
    id: "2",
    url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop",
    caption: "Max during his morning walk",
    isPrimary: false,
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    size: 856000,
    dimensions: { width: 800, height: 800 },
  },
  {
    id: "3",
    url: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400&h=400&fit=crop",
    caption: "Luna at the vet checkup",
    isPrimary: false,
    uploadedAt: new Date(Date.now() - 172800000).toISOString(),
    size: 765000,
    dimensions: { width: 600, height: 800 },
  },
  {
    id: "4",
    url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=400&fit=crop",
    caption: "Charlie sleeping peacefully",
    isPrimary: false,
    uploadedAt: new Date(Date.now() - 259200000).toISOString(),
    size: 634000,
    dimensions: { width: 800, height: 600 },
  },
  {
    id: "5",
    url: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1544568100-847a948585b9?w=400&h=400&fit=crop",
    caption: "Oscar with his favorite toy",
    isPrimary: false,
    uploadedAt: new Date(Date.now() - 345600000).toISOString(),
    size: 892000,
    dimensions: { width: 800, height: 800 },
  },
  {
    id: "6",
    url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&h=800&fit=crop",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop",
    caption: "Ruby enjoying the sunshine",
    isPrimary: false,
    uploadedAt: new Date(Date.now() - 432000000).toISOString(),
    size: 723000,
    dimensions: { width: 600, height: 800 },
  },
];

/**
 * PhotoGalleryDemo - Comprehensive demo of the PhotoGallery component
 * showcasing all features including responsive grid, lightbox, lazy loading,
 * touch gestures, and photo management
 */
export function PhotoGalleryDemo() {
  const [photos, setPhotos] = useState<Photo[]>(DEMO_PHOTOS);
  const [isLoading, setIsLoading] = useState(false);

  // Demo configuration state
  const [config, setConfig] = useState({
    maxColumns: 4,
    showCaptions: true,
    enableLazyLoading: true,
    enableSwipeGestures: true,
    allowDelete: true,
    allowSetPrimary: true,
    allowReorder: false,
  });

  /**
   * Simulate photo deletion
   */
  const handlePhotoDelete = async (photoId: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    setPhotos((prevPhotos) => {
      const remainingPhotos = prevPhotos.filter((p) => p.id !== photoId);

      // If we deleted the primary photo, make the first remaining photo primary
      if (
        prevPhotos.find((p) => p.id === photoId)?.isPrimary &&
        remainingPhotos.length > 0
      ) {
        const firstPhoto = remainingPhotos[0];
        if (firstPhoto) {
          firstPhoto.isPrimary = true;
        }
      }

      return remainingPhotos;
    });
  };

  /**
   * Simulate setting primary photo
   */
  const handlePhotoPrimary = async (photoId: string): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    setPhotos((prevPhotos) =>
      prevPhotos.map((photo) => ({
        ...photo,
        isPrimary: photo.id === photoId,
      })),
    );
  };

  /**
   * Simulate photo reordering
   */
  const handlePhotoReorder = async (photoIds: string[]): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const reorderedPhotos = photoIds
      .map((id) => photos.find((photo) => photo.id === id))
      .filter((photo): photo is Photo => photo !== undefined);

    setPhotos(reorderedPhotos);
  };

  /**
   * Reset demo data
   */
  const resetDemoData = () => {
    setPhotos([...DEMO_PHOTOS]);
  };

  /**
   * Simulate loading state
   */
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  /**
   * Clear all photos (to show empty state)
   */
  const clearPhotos = () => {
    setPhotos([]);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-3xl">PhotoGallery Component Demo</h1>
        <p className="text-muted-foreground">
          A comprehensive photo gallery with lightbox, touch gestures, lazy
          loading, and management features.
        </p>
      </div>

      {/* Features overview */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
          <CardDescription>
            This PhotoGallery component includes all the requested features and
            more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold">📱 Responsive Design</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• CSS Grid layout adapts to screen size</li>
                <li>• Mobile-first responsive design</li>
                <li>• Configurable column count</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">🖼️ Lightbox Modal</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Full-screen photo viewing</li>
                <li>• Zoom controls (0.5x to 5x)</li>
                <li>• Pan support for zoomed images</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">👆 Touch Gestures</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Swipe left/right to navigate</li>
                <li>• Pinch to zoom</li>
                <li>• Pan zoomed images</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">🗑️ Photo Management</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Delete photos with confirmation</li>
                <li>• Set primary photo</li>
                <li>• Download photos</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">⚡ Performance</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Lazy loading with Intersection Observer</li>
                <li>• Progressive image loading</li>
                <li>• Skeleton loading states</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">♿ Accessibility</h4>
              <ul className="space-y-1 text-muted-foreground text-sm">
                <li>• Keyboard navigation support</li>
                <li>• Screen reader friendly</li>
                <li>• Focus management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Adjust the gallery settings to see how the component adapts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Layout Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold">Layout</h4>

              <div className="space-y-2">
                <Label htmlFor="maxColumns">
                  Max Columns: {config.maxColumns}
                </Label>
                <input
                  id="maxColumns"
                  type="range"
                  min="1"
                  max="5"
                  value={config.maxColumns}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxColumns: parseInt(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showCaptions"
                  checked={config.showCaptions}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, showCaptions: checked }))
                  }
                />
                <Label htmlFor="showCaptions">Show captions</Label>
              </div>
            </div>

            {/* Performance Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold">Performance</h4>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableLazyLoading"
                  checked={config.enableLazyLoading}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      enableLazyLoading: checked,
                    }))
                  }
                />
                <Label htmlFor="enableLazyLoading">Lazy loading</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableSwipeGestures"
                  checked={config.enableSwipeGestures}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      enableSwipeGestures: checked,
                    }))
                  }
                />
                <Label htmlFor="enableSwipeGestures">Swipe gestures</Label>
              </div>
            </div>

            {/* Management Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold">Management</h4>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowDelete"
                  checked={config.allowDelete}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, allowDelete: checked }))
                  }
                />
                <Label htmlFor="allowDelete">Allow delete</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowSetPrimary"
                  checked={config.allowSetPrimary}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, allowSetPrimary: checked }))
                  }
                />
                <Label htmlFor="allowSetPrimary">Allow set primary</Label>
              </div>
            </div>
          </div>

          {/* Demo Controls */}
          <div className="border-t pt-4">
            <h4 className="mb-3 font-semibold">Demo Controls</h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetDemoData} variant="outline" size="sm">
                Reset Demo Data
              </Button>
              <Button onClick={simulateLoading} variant="outline" size="sm">
                Simulate Loading
              </Button>
              <Button onClick={clearPhotos} variant="outline" size="sm">
                Clear Photos (Empty State)
              </Button>
              <Badge variant="secondary">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>
            How to interact with the photo gallery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold">Desktop</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  • <strong>Click</strong> any photo to open lightbox
                </li>
                <li>
                  • <strong>Arrow keys</strong> to navigate photos
                </li>
                <li>
                  • <strong>+/-</strong> keys to zoom in/out
                </li>
                <li>
                  • <strong>0</strong> key to reset zoom
                </li>
                <li>
                  • <strong>Escape</strong> to close lightbox
                </li>
                <li>
                  • <strong>Three dots</strong> for photo actions
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Mobile</h4>
              <ul className="space-y-1 text-sm">
                <li>
                  • <strong>Tap</strong> any photo to open lightbox
                </li>
                <li>
                  • <strong>Swipe left/right</strong> to navigate
                </li>
                <li>
                  • <strong>Pinch</strong> to zoom in/out
                </li>
                <li>
                  • <strong>Drag</strong> to pan zoomed images
                </li>
                <li>
                  • <strong>Tap outside</strong> to close lightbox
                </li>
                <li>
                  • <strong>Long press</strong> for photo actions
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Photo Gallery</CardTitle>
          <CardDescription>
            Interactive gallery with all features enabled. Try clicking photos,
            using keyboard shortcuts, and testing touch gestures on mobile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoGallery
            photos={photos}
            onPhotoDelete={config.allowDelete ? handlePhotoDelete : undefined}
            onPhotoPrimary={
              config.allowSetPrimary ? handlePhotoPrimary : undefined
            }
            onPhotoReorder={
              config.allowReorder ? handlePhotoReorder : undefined
            }
            isLoading={isLoading}
            maxColumns={config.maxColumns}
            showCaptions={config.showCaptions}
            enableLazyLoading={config.enableLazyLoading}
            enableSwipeGestures={config.enableSwipeGestures}
            allowDelete={config.allowDelete}
            allowSetPrimary={config.allowSetPrimary}
            allowReorder={config.allowReorder}
          />
        </CardContent>
      </Card>

      {/* Integration Example */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Example</CardTitle>
          <CardDescription>
            How to use the PhotoGallery component in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            {`import { PhotoGallery, type Photo } from "@/components/ui/photo-gallery";

// Define your photo data
const photos: Photo[] = [
  {
    id: "1",
    url: "https://example.com/photo1.jpg",
    thumbnailUrl: "https://example.com/thumb1.jpg",
    caption: "My pet's photo",
    isPrimary: true,
  },
  // ... more photos
];

// Use in your component
function AnimalProfile({ animalId }: { animalId: string }) {
  const handlePhotoDelete = async (photoId: string) => {
    await deleteAnimalPhoto(animalId, photoId);
    // Refresh photos list
  };

  const handleSetPrimary = async (photoId: string) => {
    await setAnimalPrimaryPhoto(animalId, photoId);
    // Update photos list
  };

  return (
    <PhotoGallery
      photos={photos}
      onPhotoDelete={handlePhotoDelete}
      onPhotoPrimary={handleSetPrimary}
      maxColumns={4}
      allowDelete={true}
      allowSetPrimary={true}
      enableLazyLoading={true}
      enableSwipeGestures={true}
    />
  );
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
