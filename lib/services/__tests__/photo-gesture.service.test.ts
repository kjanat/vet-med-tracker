// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
  type GestureConfig,
  PhotoGestureService,
  type SwipeState,
  type TouchEventData,
  type TouchState,
} from "../photo-gesture.service";
import type { LightboxState } from "../photo-viewer.service";

describe("PhotoGestureService", () => {
  const mockLightboxState: LightboxState = {
    currentIndex: 1,
    isDragging: false,
    isOpen: true,
    lastPanX: 0,
    lastPanY: 0,
    panX: 0,
    panY: 0,
    zoom: 1,
  };

  describe("createInitialSwipeState", () => {
    it("should create initial swipe state with default threshold", () => {
      const state = PhotoGestureService.createInitialSwipeState();

      expect(state).toEqual({
        currentX: 0,
        currentY: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        threshold: 50,
      });
    });

    it("should create initial swipe state with custom threshold", () => {
      const state = PhotoGestureService.createInitialSwipeState(100);
      expect(state.threshold).toBe(100);
    });
  });

  describe("createInitialTouchState", () => {
    it("should create initial touch state", () => {
      const state = PhotoGestureService.createInitialTouchState();

      expect(state).toEqual({
        initialDistance: 0,
        initialZoom: 1,
        touches: 0,
      });
    });
  });

  describe("parseTouchEvent", () => {
    const createMockTouchEvent = (
      touchData: Array<{ x: number; y: number }>,
    ): React.TouchEvent =>
      ({
        touches: touchData.map((t) => ({ clientX: t.x, clientY: t.y })),
      }) as React.TouchEvent;

    it("should parse single touch event", () => {
      const mockEvent = createMockTouchEvent([{ x: 100, y: 200 }]);
      const result = PhotoGestureService.parseTouchEvent(mockEvent);

      expect(result).toEqual({
        clientX: 100,
        clientY: 200,
        touches: 1,
      });
    });

    it("should parse two-touch event", () => {
      const mockEvent = createMockTouchEvent([
        { x: 100, y: 200 },
        { x: 150, y: 250 },
      ]);
      const result = PhotoGestureService.parseTouchEvent(mockEvent);

      expect(result).toEqual({
        clientX: 100,
        clientY: 200,
        touch1: { clientX: 100, clientY: 200 },
        touch2: { clientX: 150, clientY: 250 },
        touches: 2,
      });
    });

    it("should handle empty touch event", () => {
      const mockEvent = createMockTouchEvent([]);
      const result = PhotoGestureService.parseTouchEvent(mockEvent);

      expect(result).toEqual({
        clientX: 0,
        clientY: 0,
        touches: 0,
      });
    });
  });

  describe("handleTouchStart", () => {
    const defaultConfig: GestureConfig = {
      enablePanWhenZoomed: true,
      enablePinchZoom: true,
      enableSwipeNavigation: true,
      swipeThreshold: 50,
    };

    it("should handle single touch start", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchStart(
        touchData,
        mockLightboxState,
        defaultConfig,
      );

      expect(result.swipeState.isDragging).toBe(true);
      expect(result.swipeState.startX).toBe(100);
      expect(result.swipeState.startY).toBe(200);
      expect(result.lightboxState.isDragging).toBe(false); // Not zoomed
      expect(result.touchState.touches).toBe(0);
    });

    it("should enable pan dragging when zoomed", () => {
      const zoomedState = { ...mockLightboxState, panX: 25, panY: 15, zoom: 2 };
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchStart(
        touchData,
        zoomedState,
        defaultConfig,
      );

      expect(result.lightboxState.isDragging).toBe(true);
      expect(result.lightboxState.lastPanX).toBe(25);
      expect(result.lightboxState.lastPanY).toBe(15);
    });

    it("should handle two-touch start for pinch zoom", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touch1: { clientX: 100, clientY: 200 },
        touch2: { clientX: 150, clientY: 250 },
        touches: 2,
      };

      const result = PhotoGestureService.handleTouchStart(
        touchData,
        mockLightboxState,
        defaultConfig,
      );

      expect(result.touchState.touches).toBe(2);
      expect(result.touchState.initialZoom).toBe(1);
      expect(result.touchState.initialDistance).toBeCloseTo(70.71, 2); // sqrt(50^2 + 50^2)
      expect(result.swipeState.isDragging).toBe(false);
    });

    it("should disable features based on config", () => {
      const disabledConfig: GestureConfig = {
        enablePanWhenZoomed: false,
        enablePinchZoom: false,
        enableSwipeNavigation: false,
        swipeThreshold: 50,
      };

      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchStart(
        touchData,
        mockLightboxState,
        disabledConfig,
      );

      expect(result.swipeState.isDragging).toBe(false);
    });
  });

  describe("handleTouchMove", () => {
    const swipeState: SwipeState = {
      currentX: 100,
      currentY: 200,
      isDragging: true,
      startX: 100,
      startY: 200,
      threshold: 50,
    };

    const touchState: TouchState = {
      initialDistance: 70.71,
      initialZoom: 1,
      touches: 2,
    };

    it("should handle single touch pan when zoomed", () => {
      const zoomedState = {
        ...mockLightboxState,
        isDragging: true,
        lastPanX: 10,
        lastPanY: 20,
        zoom: 2,
      };

      const touchData: TouchEventData = {
        clientX: 150, // moved 50px right
        clientY: 250, // moved 50px down
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchMove(
        touchData,
        swipeState,
        touchState,
        zoomedState,
      );

      expect(result.swipeState.currentX).toBe(150);
      expect(result.swipeState.currentY).toBe(250);
      expect(result.lightboxState.panX).toBe(60); // lastPanX + deltaX (10 + 50)
      expect(result.lightboxState.panY).toBe(70); // lastPanY + deltaY (20 + 50)
      expect(result.shouldPreventDefault).toBe(true);
    });

    it("should handle single touch swipe when not zoomed", () => {
      const touchData: TouchEventData = {
        clientX: 150,
        clientY: 250,
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchMove(
        touchData,
        swipeState,
        touchState,
        mockLightboxState,
      );

      expect(result.swipeState.currentX).toBe(150);
      expect(result.swipeState.currentY).toBe(250);
      expect(result.lightboxState.panX).toBe(0); // No pan when not zoomed
      expect(result.lightboxState.panY).toBe(0);
    });

    it("should handle pinch zoom", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touch1: { clientX: 80, clientY: 180 },
        touch2: { clientX: 120, clientY: 220 },
        touches: 2,
      };

      const result = PhotoGestureService.handleTouchMove(
        touchData,
        swipeState,
        touchState,
        mockLightboxState,
      );

      // New distance should be smaller, so zoom should decrease
      const expectedNewDistance = Math.sqrt(40 * 40 + 40 * 40); // ~56.57
      const _expectedScale = expectedNewDistance / touchState.initialDistance; // ~0.8

      expect(result.lightboxState.zoom).toBeCloseTo(0.8, 1);
      expect(result.shouldPreventDefault).toBe(true);
    });

    it("should not handle touch move when not dragging", () => {
      const notDraggingState = { ...swipeState, isDragging: false };
      const touchData: TouchEventData = {
        clientX: 150,
        clientY: 250,
        touches: 1,
      };

      const result = PhotoGestureService.handleTouchMove(
        touchData,
        notDraggingState,
        touchState,
        mockLightboxState,
      );

      expect(result.shouldPreventDefault).toBe(false);
      expect(result.lightboxState).toEqual(mockLightboxState);
    });
  });

  describe("handleTouchEnd", () => {
    it("should evaluate swipe and reset states", () => {
      const swipeState: SwipeState = {
        currentX: 200, // Moved 100px right
        currentY: 200,
        isDragging: true,
        startX: 100,
        startY: 200,
        threshold: 50,
      };

      const result = PhotoGestureService.handleTouchEnd(
        swipeState,
        mockLightboxState,
      );

      expect(result.swipeResult.shouldNavigate).toBe(true);
      expect(result.swipeResult.direction).toBe(-1); // Swipe right = previous
      expect(result.resetStates.swipeState.isDragging).toBe(false);
      expect(result.resetStates.lightboxState.isDragging).toBe(false);
      expect(result.resetStates.touchState.touches).toBe(0);
    });
  });

  describe("evaluateSwipeNavigation", () => {
    const createSwipeState = (
      startX: number,
      startY: number,
      currentX: number,
      currentY: number,
      isDragging = true,
    ): SwipeState => ({
      currentX,
      currentY,
      isDragging,
      startX,
      startY,
      threshold: 50,
    });

    it("should detect valid horizontal swipe right", () => {
      const swipeState = createSwipeState(100, 200, 200, 210); // 100px right, 10px down

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        mockLightboxState,
      );

      expect(result.shouldNavigate).toBe(true);
      expect(result.direction).toBe(-1); // Previous photo
      expect(result.reason).toContain("right");
    });

    it("should detect valid horizontal swipe left", () => {
      const swipeState = createSwipeState(200, 200, 100, 210); // 100px left, 10px down

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        mockLightboxState,
      );

      expect(result.shouldNavigate).toBe(true);
      expect(result.direction).toBe(1); // Next photo
      expect(result.reason).toContain("left");
    });

    it("should reject vertical swipe", () => {
      const swipeState = createSwipeState(100, 100, 110, 200); // 10px right, 100px down

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        mockLightboxState,
      );

      expect(result.shouldNavigate).toBe(false);
      expect(result.reason).toContain("Vertical movement");
    });

    it("should reject swipe below threshold", () => {
      const swipeState = createSwipeState(100, 200, 130, 205); // 30px right, 5px down

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        mockLightboxState,
      );

      expect(result.shouldNavigate).toBe(false);
      expect(result.reason).toContain("below threshold");
    });

    it("should reject swipe when zoomed", () => {
      const zoomedState = { ...mockLightboxState, zoom: 2 };
      const swipeState = createSwipeState(100, 200, 200, 210); // Valid swipe distance

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        zoomedState,
      );

      expect(result.shouldNavigate).toBe(false);
      expect(result.reason).toContain("zoomed");
    });

    it("should reject when not dragging", () => {
      const swipeState = createSwipeState(100, 200, 200, 210, false);

      const result = PhotoGestureService.evaluateSwipeNavigation(
        swipeState,
        mockLightboxState,
      );

      expect(result.shouldNavigate).toBe(false);
      expect(result.reason).toContain("not dragging");
    });
  });

  describe("calculateTouchDistance", () => {
    it("should calculate distance between two touches", () => {
      const touch1 = { clientX: 0, clientY: 0 };
      const touch2 = { clientX: 3, clientY: 4 };

      const distance = PhotoGestureService.calculateTouchDistance(
        touch1,
        touch2,
      );
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it("should handle same position touches", () => {
      const touch1 = { clientX: 100, clientY: 200 };
      const touch2 = { clientX: 100, clientY: 200 };

      const distance = PhotoGestureService.calculateTouchDistance(
        touch1,
        touch2,
      );
      expect(distance).toBe(0);
    });
  });

  describe("validateConfig", () => {
    it("should validate correct config", () => {
      const config: GestureConfig = {
        enablePanWhenZoomed: true,
        enablePinchZoom: true,
        enableSwipeNavigation: true,
        swipeThreshold: 50,
      };

      expect(() => PhotoGestureService.validateConfig(config)).not.toThrow();
    });

    it("should throw error for invalid swipe threshold", () => {
      const config = {
        enablePanWhenZoomed: true,
        enablePinchZoom: true,
        enableSwipeNavigation: true,
        swipeThreshold: 0,
      };

      expect(() => PhotoGestureService.validateConfig(config)).toThrow(
        "swipeThreshold must be greater than 0",
      );
    });
  });

  describe("shouldHandleTouchEvent", () => {
    const config: GestureConfig = {
      enablePanWhenZoomed: true,
      enablePinchZoom: true,
      enableSwipeNavigation: true,
      swipeThreshold: 50,
    };

    it("should not handle when lightbox closed", () => {
      const closedState = { ...mockLightboxState, isOpen: false };
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.shouldHandleTouchEvent(
        touchData,
        closedState,
        config,
      );

      expect(result).toBe(false);
    });

    it("should handle single touch when navigation enabled", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.shouldHandleTouchEvent(
        touchData,
        mockLightboxState,
        config,
      );

      expect(result).toBe(true);
    });

    it("should handle two touches when pinch zoom enabled", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touch1: { clientX: 100, clientY: 200 },
        touch2: { clientX: 150, clientY: 250 },
        touches: 2,
      };

      const result = PhotoGestureService.shouldHandleTouchEvent(
        touchData,
        mockLightboxState,
        config,
      );

      expect(result).toBe(true);
    });

    it("should not handle when features disabled", () => {
      const disabledConfig: GestureConfig = {
        enablePanWhenZoomed: false,
        enablePinchZoom: false,
        enableSwipeNavigation: false,
        swipeThreshold: 50,
      };

      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 1,
      };

      const result = PhotoGestureService.shouldHandleTouchEvent(
        touchData,
        mockLightboxState,
        disabledConfig,
      );

      expect(result).toBe(false);
    });
  });

  describe("getGestureFeedback", () => {
    it("should provide feedback for no touches", () => {
      const touchData: TouchEventData = { clientX: 0, clientY: 0, touches: 0 };
      const swipeState = PhotoGestureService.createInitialSwipeState();

      const feedback = PhotoGestureService.getGestureFeedback(
        touchData,
        swipeState,
        mockLightboxState,
      );

      expect(feedback).toBe("No touches detected");
    });

    it("should provide feedback for single touch swipe", () => {
      const touchData: TouchEventData = {
        clientX: 150,
        clientY: 220,
        touches: 1,
      };
      const swipeState: SwipeState = {
        currentX: 150,
        currentY: 220,
        isDragging: true,
        startX: 100,
        startY: 200,
        threshold: 50,
      };

      const feedback = PhotoGestureService.getGestureFeedback(
        touchData,
        swipeState,
        mockLightboxState,
      );

      expect(feedback).toContain("Swiping");
      expect(feedback).toContain("ΔX=50px");
      expect(feedback).toContain("ΔY=20px");
    });

    it("should provide feedback for panning when zoomed", () => {
      const touchData: TouchEventData = {
        clientX: 150,
        clientY: 220,
        touches: 1,
      };
      const swipeState: SwipeState = {
        currentX: 150,
        currentY: 220,
        isDragging: true,
        startX: 100,
        startY: 200,
        threshold: 50,
      };
      const zoomedState = { ...mockLightboxState, zoom: 2 };

      const feedback = PhotoGestureService.getGestureFeedback(
        touchData,
        swipeState,
        zoomedState,
      );

      expect(feedback).toContain("Panning");
      expect(feedback).toContain("zoom: 2");
    });

    it("should provide feedback for pinch zoom", () => {
      const touchData: TouchEventData = {
        clientX: 100,
        clientY: 200,
        touches: 2,
      };
      const swipeState = PhotoGestureService.createInitialSwipeState();
      const zoomedState = { ...mockLightboxState, zoom: 1.5 };

      const feedback = PhotoGestureService.getGestureFeedback(
        touchData,
        swipeState,
        zoomedState,
      );

      expect(feedback).toContain("Pinch zoom: 1.50x");
    });
  });
});
