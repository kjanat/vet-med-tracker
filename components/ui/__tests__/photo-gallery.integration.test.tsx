// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

type Photo = {
  caption: string;
  dimensions: { height: number; width: number };
  id: string;
  isPrimary: boolean;
  size: number;
  thumbnailUrl: string;
  uploadedAt: string;
  url: string;
};
let PhotoGallery: typeof import("../photo-gallery").PhotoGallery;
const OriginalURL = URL;

// Mock the toast hook
const mockToast = {
  toast: () => {},
};
mock("../use-toast", () => ({
  useToast: () => mockToast,
}));

mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { alt = "", ...rest } = props;
    return (
      <div
        data-next-image
        data-next-image-alt={typeof alt === "string" ? alt : undefined}
        {...(rest as Record<string, unknown>)}
      />
    );
  },
}));

beforeAll(async () => {
  globalThis.URL = class extends OriginalURL {
    constructor(input: string | URL, base?: string | URL) {
      if (typeof input === "string" && input.startsWith("/")) {
        super(input, base ?? "http://localhost");
        return;
      }
      super(input, base);
    }
  } as typeof URL;
  ({ PhotoGallery } = await import("../photo-gallery"));
});

afterAll(() => {
  globalThis.URL = OriginalURL;
});

describe("PhotoGallery Integration", () => {
  const mockPhotos: Photo[] = [
    {
      caption: "Test photo 1",
      dimensions: { height: 1080, width: 1920 },
      id: "photo1",
      isPrimary: true,
      size: 1024 * 1024,
      thumbnailUrl: "https://example.com/thumb1.jpg",
      uploadedAt: "2024-01-15T10:00:00Z",
      url: "https://example.com/photo1.jpg",
    },
    {
      caption: "Test photo 2",
      dimensions: { height: 1080, width: 1920 },
      id: "photo2",
      isPrimary: false,
      size: 2 * 1024 * 1024,
      thumbnailUrl: "https://example.com/thumb2.jpg",
      uploadedAt: "2024-01-16T11:00:00Z",
      url: "https://example.com/photo2.jpg",
    },
  ];

  it("should render photo gallery with photos", () => {
    render(
      <PhotoGallery
        allowDelete={false}
        allowReorder={false}
        allowSetPrimary={false}
        enableLazyLoading={false}
        enableSwipeGestures={true}
        photos={mockPhotos}
        showCaptions={true}
      />,
    );

    expect(screen.getAllByText("Photos (2)")[0]).toBeDefined();
    expect(screen.getByText("Test photo 1")).toBeDefined();
    expect(screen.getByText("Test photo 2")).toBeDefined();
    expect(screen.getByText("Primary")).toBeDefined();
  });

  it("should render empty state when no photos", () => {
    render(
      <PhotoGallery
        allowDelete={false}
        allowReorder={false}
        allowSetPrimary={false}
        enableLazyLoading={false}
        enableSwipeGestures={true}
        photos={[]}
        showCaptions={true}
      />,
    );

    expect(screen.getAllByText("Photos").length).toBeGreaterThan(0);
    expect(screen.getByText("No photos yet")).toBeDefined();
    expect(screen.getByText("Upload photos to create a gallery")).toBeDefined();
  });

  it("should render loading state", () => {
    render(
      <PhotoGallery
        allowDelete={false}
        allowReorder={false}
        allowSetPrimary={false}
        enableLazyLoading={false}
        enableSwipeGestures={true}
        isLoading={true}
        photos={[]}
        showCaptions={true}
      />,
    );

    expect(screen.getAllByText("Photos").length).toBeGreaterThan(0);
    // Loading state shows skeleton elements
  });

  it("should handle service configuration properly", () => {
    // This test ensures that the services are properly initialized
    // without actually testing their implementation details
    const { container } = render(
      <PhotoGallery
        allowDelete={true}
        allowReorder={true}
        allowSetPrimary={true}
        enableLazyLoading={true}
        enableSwipeGestures={true}
        maxColumns={3}
        photos={mockPhotos}
        showCaptions={true}
      />,
    );

    // Should render without errors
    expect(container).toBeDefined();
    expect(screen.getAllByText("Photos (2)")[0]).toBeDefined();
  });
});
