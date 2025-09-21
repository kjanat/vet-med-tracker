/**
 * PhotoGestureService
 *
 * Handles touch gestures, swipe navigation, pinch-to-zoom,
 * and mobile interaction patterns for the photo gallery.
 */

import type React from "react";
import type { LightboxState } from "./photo-viewer.service";

export interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  threshold: number;
}

export interface TouchState {
  initialDistance: number;
  initialZoom: number;
  touches: number;
}

export interface GestureConfig {
  swipeThreshold: number;
  enableSwipeNavigation: boolean;
  enablePinchZoom: boolean;
  enablePanWhenZoomed: boolean;
}

export interface SwipeResult {
  shouldNavigate: boolean;
  direction: number; // -1 for previous, 1 for next
  reason: string;
}

export interface TouchEventData {
  touches: number;
  clientX: number;
  clientY: number;
  touch1?: { clientX: number; clientY: number };
  touch2?: { clientX: number; clientY: number };
}

export class PhotoGestureService {
  private static readonly DEFAULT_CONFIG: GestureConfig = {
    enablePanWhenZoomed: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    swipeThreshold: 50,
  };

  /**
   * Creates initial swipe state
   */
  static createInitialSwipeState(threshold: number = 50): SwipeState {
    return {
      currentX: 0,
      currentY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      threshold,
    };
  }

  /**
   * Creates initial touch state
   */
  static createInitialTouchState(): TouchState {
    return {
      initialDistance: 0,
      initialZoom: 1,
      touches: 0,
    };
  }

  /**
   * Parse touch event data from React TouchEvent
   */
  static parseTouchEvent(event: React.TouchEvent): TouchEventData {
    const touches = event.touches;
    const touchCount = touches.length;

    if (touchCount === 0) {
      return { clientX: 0, clientY: 0, touches: 0 };
    }

    const firstTouch = touches[0];
    if (!firstTouch) {
      return { clientX: 0, clientY: 0, touches: 0 };
    }

    const data: TouchEventData = {
      clientX: firstTouch.clientX,
      clientY: firstTouch.clientY,
      touches: touchCount,
    };

    if (touchCount >= 2 && touches[1]) {
      data.touch1 = {
        clientX: firstTouch.clientX,
        clientY: firstTouch.clientY,
      };
      data.touch2 = {
        clientX: touches[1].clientX,
        clientY: touches[1].clientY,
      };
    }

    return data;
  }

  /**
   * Handle touch start for single or multi-touch gestures
   */
  static handleTouchStart(
    touchData: TouchEventData,
    lightboxState: LightboxState,
    config: GestureConfig = PhotoGestureService.DEFAULT_CONFIG,
  ): {
    swipeState: SwipeState;
    touchState: TouchState;
    lightboxState: LightboxState;
  } {
    if (touchData.touches === 1) {
      // Single touch - initialize swipe
      const swipeState: SwipeState = {
        currentX: touchData.clientX,
        currentY: touchData.clientY,
        isDragging: config.enableSwipeNavigation,
        startX: touchData.clientX,
        startY: touchData.clientY,
        threshold: config.swipeThreshold,
      };

      const updatedLightboxState: LightboxState = {
        ...lightboxState,
        isDragging: config.enablePanWhenZoomed && lightboxState.zoom > 1,
        lastPanX: lightboxState.panX,
        lastPanY: lightboxState.panY,
      };

      return {
        lightboxState: updatedLightboxState,
        swipeState,
        touchState: PhotoGestureService.createInitialTouchState(),
      };
    }

    if (touchData.touches === 2 && touchData.touch1 && touchData.touch2) {
      // Two touches - initialize pinch zoom
      const distance = PhotoGestureService.calculateTouchDistance(
        touchData.touch1,
        touchData.touch2,
      );

      const touchState: TouchState = {
        initialDistance: distance,
        initialZoom: lightboxState.zoom,
        touches: 2,
      };

      return {
        lightboxState,
        swipeState: PhotoGestureService.createInitialSwipeState(
          config.swipeThreshold,
        ),
        touchState,
      };
    }

    // Multiple touches or invalid state
    return {
      lightboxState,
      swipeState: PhotoGestureService.createInitialSwipeState(
        config.swipeThreshold,
      ),
      touchState: PhotoGestureService.createInitialTouchState(),
    };
  }

  /**
   * Handle touch move for pan and pinch gestures
   */
  static handleTouchMove(
    touchData: TouchEventData,
    currentSwipeState: SwipeState,
    currentTouchState: TouchState,
    lightboxState: LightboxState,
    config: GestureConfig = PhotoGestureService.DEFAULT_CONFIG,
  ): {
    swipeState: SwipeState;
    lightboxState: LightboxState;
    shouldPreventDefault: boolean;
  } {
    if (touchData.touches === 1 && currentSwipeState.isDragging) {
      // Single touch pan/swipe
      const deltaX = touchData.clientX - currentSwipeState.startX;
      const deltaY = touchData.clientY - currentSwipeState.startY;

      const updatedSwipeState: SwipeState = {
        ...currentSwipeState,
        currentX: touchData.clientX,
        currentY: touchData.clientY,
      };

      let updatedLightboxState = lightboxState;

      // Pan if zoomed and pan is enabled
      if (
        config.enablePanWhenZoomed &&
        lightboxState.zoom > 1 &&
        lightboxState.isDragging
      ) {
        updatedLightboxState = {
          ...lightboxState,
          panX: lightboxState.lastPanX + deltaX,
          panY: lightboxState.lastPanY + deltaY,
        };
      }

      return {
        lightboxState: updatedLightboxState,
        shouldPreventDefault: true,
        swipeState: updatedSwipeState,
      };
    }

    if (
      touchData.touches === 2 &&
      touchData.touch1 &&
      touchData.touch2 &&
      currentTouchState.touches === 2 &&
      config.enablePinchZoom
    ) {
      // Pinch zoom
      const distance = PhotoGestureService.calculateTouchDistance(
        touchData.touch1,
        touchData.touch2,
      );
      const scale = distance / currentTouchState.initialDistance;
      const newZoom = Math.min(
        Math.max(currentTouchState.initialZoom * scale, 0.5),
        5,
      );

      const updatedLightboxState: LightboxState = {
        ...lightboxState,
        zoom: newZoom,
      };

      return {
        lightboxState: updatedLightboxState,
        shouldPreventDefault: true,
        swipeState: currentSwipeState,
      };
    }

    return {
      lightboxState,
      shouldPreventDefault: false,
      swipeState: currentSwipeState,
    };
  }

  /**
   * Handle touch end and determine if navigation should occur
   */
  static handleTouchEnd(
    currentSwipeState: SwipeState,
    lightboxState: LightboxState,
    config: GestureConfig = PhotoGestureService.DEFAULT_CONFIG,
  ): {
    swipeResult: SwipeResult;
    resetStates: {
      swipeState: SwipeState;
      touchState: TouchState;
      lightboxState: LightboxState;
    };
  } {
    const swipeResult = PhotoGestureService.evaluateSwipeNavigation(
      currentSwipeState,
      lightboxState,
      config,
    );

    const resetStates = {
      lightboxState: {
        ...lightboxState,
        isDragging: false,
      },
      swipeState: {
        ...currentSwipeState,
        isDragging: false,
      },
      touchState: PhotoGestureService.createInitialTouchState(),
    };

    return {
      resetStates,
      swipeResult,
    };
  }

  /**
   * Evaluate if swipe gesture should trigger navigation
   */
  static evaluateSwipeNavigation(
    swipeState: SwipeState,
    lightboxState: LightboxState,
    config: GestureConfig = PhotoGestureService.DEFAULT_CONFIG,
  ): SwipeResult {
    if (!config.enableSwipeNavigation || !swipeState.isDragging) {
      return {
        direction: 0,
        reason: "Swipe navigation disabled or not dragging",
        shouldNavigate: false,
      };
    }

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = swipeState.currentY - swipeState.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Don't navigate if zoomed (allow panning instead)
    if (lightboxState.zoom > 1) {
      return {
        direction: 0,
        reason: "Image is zoomed, panning takes precedence",
        shouldNavigate: false,
      };
    }

    // Must be primarily horizontal movement
    if (absDeltaX <= absDeltaY) {
      return {
        direction: 0,
        reason: "Vertical movement detected, not a horizontal swipe",
        shouldNavigate: false,
      };
    }

    // Must exceed threshold
    if (absDeltaX <= swipeState.threshold) {
      return {
        direction: 0,
        reason: `Swipe distance ${absDeltaX}px below threshold ${swipeState.threshold}px`,
        shouldNavigate: false,
      };
    }

    const direction = deltaX > 0 ? -1 : 1; // Swipe right = previous, swipe left = next

    return {
      direction,
      reason: `Horizontal swipe ${deltaX > 0 ? "right" : "left"} exceeded threshold`,
      shouldNavigate: true,
    };
  }

  /**
   * Calculate distance between two touch points
   */
  static calculateTouchDistance(
    touch1: { clientX: number; clientY: number },
    touch2: { clientX: number; clientY: number },
  ): number {
    return Math.sqrt(
      (touch1.clientX - touch2.clientX) ** 2 +
        (touch1.clientY - touch2.clientY) ** 2,
    );
  }

  /**
   * Validate gesture configuration
   */
  static validateConfig(config: Partial<GestureConfig>): GestureConfig {
    const validated = { ...PhotoGestureService.DEFAULT_CONFIG, ...config };

    if (validated.swipeThreshold <= 0) {
      throw new Error("swipeThreshold must be greater than 0");
    }

    return validated;
  }

  /**
   * Check if touch event should be handled
   */
  static shouldHandleTouchEvent(
    touchData: TouchEventData,
    lightboxState: LightboxState,
    config: GestureConfig,
  ): boolean {
    if (!lightboxState.isOpen) {
      return false;
    }

    if (touchData.touches === 1) {
      return config.enableSwipeNavigation || config.enablePanWhenZoomed;
    }

    if (touchData.touches === 2) {
      return config.enablePinchZoom;
    }

    return false;
  }

  /**
   * Get gesture feedback message for debugging
   */
  static getGestureFeedback(
    touchData: TouchEventData,
    swipeState: SwipeState,
    lightboxState: LightboxState,
  ): string {
    if (touchData.touches === 0) {
      return "No touches detected";
    }

    if (touchData.touches === 1) {
      const deltaX = Math.abs(swipeState.currentX - swipeState.startX);
      const deltaY = Math.abs(swipeState.currentY - swipeState.startY);

      if (lightboxState.zoom > 1) {
        return `Panning: ΔX=${deltaX}px, ΔY=${deltaY}px (zoom: ${lightboxState.zoom})`;
      }

      return `Swiping: ΔX=${deltaX}px, ΔY=${deltaY}px (threshold: ${swipeState.threshold}px)`;
    }

    if (touchData.touches === 2) {
      return `Pinch zoom: ${lightboxState.zoom.toFixed(2)}x`;
    }

    return `Multiple touches: ${touchData.touches}`;
  }
}
