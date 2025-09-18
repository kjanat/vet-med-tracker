// Configuration constants for the viewport tester
export const VIEWPORT_CONFIG = {
  // API and data fetching
  api: {
    cacheTime: 3600000, // 1 hour in ms
    retryAttempts: 3,
    retryDelay: 1000, // ms
  },

  // Default values
  defaults: {
    layoutMode: "sidebar" as const,
    windowHeight: 800,
  },

  // Device grid
  deviceGrid: {
    cardWidth: 192, // w-48 in Tailwind = 12rem = 192px
    gap: 8, // gap-2 in Tailwind = 0.5rem = 8px
    padding: 16, // p-4 in Tailwind = 1rem = 16px
  },

  // Mobile specific
  mobile: {
    minPreviewHeight: 400, // Minimum preview height on mobile
    pinchScaleMax: 2, // Maximum zoom level
    pinchScaleMin: 0.5, // Minimum zoom level
    toolbarHeight: 120, // Height of mobile toolbar
    touchThreshold: 10, // Pixels to consider a touch vs drag
  },

  // Preview constraints
  preview: {
    maxWidthPercent: 90, // 90vw max width in topbar mode
    padding: 32, // p-8 in Tailwind = 2rem = 32px
    topbarMaxHeight: 400, // Height reserved for device grid in topbar mode
  },
  // Layout dimensions
  sidebar: {
    scrollPadding: 120, // Extra padding around iframe height
    width: 384, // w-96 in Tailwind = 24rem = 384px
    windowMargin: 200, // Space for toolbar and margins
  },

  // Animation and transitions
  transitions: {
    deviceSelection: 150, // ms for device selection feedback
    layoutChange: 300, // ms for layout mode transitions
    mobileDrawer: 250, // ms for mobile drawer animations
    pinchZoom: 200, // ms for pinch zoom transitions
  },
} as const;

// Helper to calculate responsive dimensions
export const calculateScrollAreaHeight = (
  iframeHeight: number,
  windowHeight: number,
): number => {
  const { scrollPadding, windowMargin } = VIEWPORT_CONFIG.sidebar;
  return Math.min(iframeHeight + scrollPadding, windowHeight - windowMargin);
};

// Helper to format error messages
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};
