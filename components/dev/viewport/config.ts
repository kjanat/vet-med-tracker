// Configuration constants for the viewport tester
export const VIEWPORT_CONFIG = {
  // Layout dimensions
  sidebar: {
    width: 384, // w-96 in Tailwind = 24rem = 384px
    scrollPadding: 120, // Extra padding around iframe height
    windowMargin: 200, // Space for toolbar and margins
  },

  // Preview constraints
  preview: {
    padding: 32, // p-8 in Tailwind = 2rem = 32px
    maxWidthPercent: 90, // 90vw max width in topbar mode
    topbarMaxHeight: 400, // Height reserved for device grid in topbar mode
  },

  // Mobile specific
  mobile: {
    toolbarHeight: 120, // Height of mobile toolbar
    minPreviewHeight: 400, // Minimum preview height on mobile
    touchThreshold: 10, // Pixels to consider a touch vs drag
    pinchScaleMin: 0.5, // Minimum zoom level
    pinchScaleMax: 2, // Maximum zoom level
  },

  // Device grid
  deviceGrid: {
    gap: 8, // gap-2 in Tailwind = 0.5rem = 8px
    padding: 16, // p-4 in Tailwind = 1rem = 16px
    cardWidth: 192, // w-48 in Tailwind = 12rem = 192px
  },

  // Animation and transitions
  transitions: {
    layoutChange: 300, // ms for layout mode transitions
    deviceSelection: 150, // ms for device selection feedback
    mobileDrawer: 250, // ms for mobile drawer animations
    pinchZoom: 200, // ms for pinch zoom transitions
  },

  // API and data fetching
  api: {
    retryAttempts: 3,
    retryDelay: 1000, // ms
    cacheTime: 3600000, // 1 hour in ms
  },

  // Default values
  defaults: {
    windowHeight: 800,
    layoutMode: "sidebar" as const,
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
