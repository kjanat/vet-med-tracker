/**
 * PhotoViewerService
 *
 * Handles lightbox functionality, zoom controls, image navigation,
 * and keyboard shortcuts for the photo viewing experience.
 */

export interface LightboxState {
  isOpen: boolean;
  currentIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  lastPanX: number;
  lastPanY: number;
}

export interface ViewerConfig {
  maxZoom: number;
  minZoom: number;
  zoomStep: number;
  enableKeyboardNav: boolean;
}

export interface NavigationResult {
  success: boolean;
  newIndex: number;
  error?: string;
}

export class PhotoViewerService {
  private static readonly DEFAULT_CONFIG: ViewerConfig = {
    enableKeyboardNav: true,
    maxZoom: 5,
    minZoom: 0.5,
    zoomStep: 1.5,
  };

  /**
   * Creates initial lightbox state
   */
  static createInitialLightboxState(): LightboxState {
    return {
      currentIndex: 0,
      isDragging: false,
      isOpen: false,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  /**
   * Opens lightbox at specific photo index
   */
  static openLightbox(index: number, totalPhotos: number): LightboxState {
    if (index < 0 || index >= totalPhotos) {
      throw new Error(
        `Invalid photo index: ${index}. Total photos: ${totalPhotos}`,
      );
    }

    return {
      currentIndex: index,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  /**
   * Closes lightbox and resets state
   */
  static closeLightbox(currentState: LightboxState): LightboxState {
    return {
      ...currentState,
      isDragging: false,
      isOpen: false,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  /**
   * Navigate to next/previous photo
   */
  static navigatePhoto(
    currentState: LightboxState,
    direction: number,
    totalPhotos: number,
  ): NavigationResult {
    const newIndex = currentState.currentIndex + direction;

    if (newIndex < 0 || newIndex >= totalPhotos) {
      return {
        error: `Cannot navigate beyond photo bounds (0-${totalPhotos - 1})`,
        newIndex: currentState.currentIndex,
        success: false,
      };
    }

    return {
      newIndex,
      success: true,
    };
  }

  /**
   * Apply navigation result to lightbox state
   */
  static applyNavigation(
    currentState: LightboxState,
    navigationResult: NavigationResult,
  ): LightboxState {
    if (!navigationResult.success) {
      return currentState;
    }

    return {
      ...currentState,
      currentIndex: navigationResult.newIndex,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  /**
   * Zoom in on the current image
   */
  static zoomIn(
    currentState: LightboxState,
    config: ViewerConfig = PhotoViewerService.DEFAULT_CONFIG,
  ): LightboxState {
    const newZoom = Math.min(
      currentState.zoom * config.zoomStep,
      config.maxZoom,
    );

    return {
      ...currentState,
      zoom: newZoom,
    };
  }

  /**
   * Zoom out on the current image
   */
  static zoomOut(
    currentState: LightboxState,
    config: ViewerConfig = PhotoViewerService.DEFAULT_CONFIG,
  ): LightboxState {
    const newZoom = Math.max(
      currentState.zoom / config.zoomStep,
      config.minZoom,
    );

    return {
      ...currentState,
      panX: newZoom <= 1 ? 0 : currentState.panX,
      panY: newZoom <= 1 ? 0 : currentState.panY,
      zoom: newZoom,
    };
  }

  /**
   * Reset zoom and pan to defaults
   */
  static resetZoom(currentState: LightboxState): LightboxState {
    return {
      ...currentState,
      panX: 0,
      panY: 0,
      zoom: 1,
    };
  }

  /**
   * Set pan position for zoomed images
   */
  static setPanPosition(
    currentState: LightboxState,
    panX: number,
    panY: number,
  ): LightboxState {
    // Only allow panning when zoomed
    if (currentState.zoom <= 1) {
      return currentState;
    }

    return {
      ...currentState,
      panX,
      panY,
    };
  }

  /**
   * Start dragging operation
   */
  static startDragging(currentState: LightboxState): LightboxState {
    return {
      ...currentState,
      isDragging: true,
      lastPanX: currentState.panX,
      lastPanY: currentState.panY,
    };
  }

  /**
   * Stop dragging operation
   */
  static stopDragging(currentState: LightboxState): LightboxState {
    return {
      ...currentState,
      isDragging: false,
    };
  }

  /**
   * Handle keyboard navigation
   */
  static handleKeyboardEvent(
    event: KeyboardEvent,
    currentState: LightboxState,
    totalPhotos: number,
    config: ViewerConfig = PhotoViewerService.DEFAULT_CONFIG,
  ): {
    newState: LightboxState;
    shouldPreventDefault: boolean;
    action: "navigate" | "zoom" | "close" | "none";
  } {
    if (!config.enableKeyboardNav || !currentState.isOpen) {
      return {
        action: "none",
        newState: currentState,
        shouldPreventDefault: false,
      };
    }

    let newState = currentState;
    let shouldPreventDefault = true;
    let action: "navigate" | "zoom" | "close" | "none" = "none";

    switch (event.key) {
      case "Escape":
        newState = PhotoViewerService.closeLightbox(currentState);
        action = "close";
        break;
      case "ArrowLeft": {
        const prevResult = PhotoViewerService.navigatePhoto(
          currentState,
          -1,
          totalPhotos,
        );
        newState = PhotoViewerService.applyNavigation(currentState, prevResult);
        action = "navigate";
        break;
      }
      case "ArrowRight": {
        const nextResult = PhotoViewerService.navigatePhoto(
          currentState,
          1,
          totalPhotos,
        );
        newState = PhotoViewerService.applyNavigation(currentState, nextResult);
        action = "navigate";
        break;
      }
      case "+":
      case "=":
        newState = PhotoViewerService.zoomIn(currentState, config);
        action = "zoom";
        break;
      case "-":
        newState = PhotoViewerService.zoomOut(currentState, config);
        action = "zoom";
        break;
      case "0":
        newState = PhotoViewerService.resetZoom(currentState);
        action = "zoom";
        break;
      default:
        shouldPreventDefault = false;
        break;
    }

    return {
      action,
      newState,
      shouldPreventDefault,
    };
  }

  /**
   * Calculate image transform style for CSS
   */
  static calculateImageTransform(state: LightboxState): string {
    return `scale(${state.zoom}) translate(${state.panX}px, ${state.panY}px)`;
  }

  /**
   * Get cursor style based on zoom level
   */
  static getCursorStyle(state: LightboxState): string {
    return state.zoom > 1 ? "grab" : "default";
  }

  /**
   * Format zoom percentage for display
   */
  static formatZoomPercentage(zoom: number): string {
    return `${Math.round(zoom * 100)}%`;
  }

  /**
   * Validate viewer configuration
   */
  static validateConfig(config: Partial<ViewerConfig>): ViewerConfig {
    const validated = { ...PhotoViewerService.DEFAULT_CONFIG, ...config };

    if (validated.minZoom >= validated.maxZoom) {
      throw new Error("minZoom must be less than maxZoom");
    }

    if (validated.zoomStep <= 1) {
      throw new Error("zoomStep must be greater than 1");
    }

    if (validated.minZoom <= 0) {
      throw new Error("minZoom must be greater than 0");
    }

    return validated;
  }
}
