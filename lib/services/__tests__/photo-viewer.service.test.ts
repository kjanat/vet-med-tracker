import { describe, expect, it } from "bun:test";
import {
  type LightboxState,
  PhotoViewerService,
  type ViewerConfig,
} from "../photo-viewer.service";

describe("PhotoViewerService", () => {
  describe("createInitialLightboxState", () => {
    it("should create initial state with correct defaults", () => {
      const state = PhotoViewerService.createInitialLightboxState();

      expect(state).toEqual({
        currentIndex: 0,
        isDragging: false,
        isOpen: false,
        lastPanX: 0,
        lastPanY: 0,
        panX: 0,
        panY: 0,
        zoom: 1,
      });
    });
  });

  describe("openLightbox", () => {
    it("should open lightbox at valid index", () => {
      const state = PhotoViewerService.openLightbox(2, 5);

      expect(state.isOpen).toBe(true);
      expect(state.currentIndex).toBe(2);
      expect(state.zoom).toBe(1);
      expect(state.panX).toBe(0);
      expect(state.panY).toBe(0);
    });

    it("should throw error for invalid index", () => {
      expect(() => PhotoViewerService.openLightbox(-1, 5)).toThrow(
        "Invalid photo index: -1. Total photos: 5",
      );

      expect(() => PhotoViewerService.openLightbox(5, 5)).toThrow(
        "Invalid photo index: 5. Total photos: 5",
      );
    });
  });

  describe("closeLightbox", () => {
    it("should reset lightbox state", () => {
      const initialState: LightboxState = {
        currentIndex: 2,
        isDragging: true,
        isOpen: true,
        lastPanX: 50,
        lastPanY: 30,
        panX: 100,
        panY: 80,
        zoom: 2.5,
      };

      const closedState = PhotoViewerService.closeLightbox(initialState);

      expect(closedState).toEqual({
        currentIndex: 2, // Preserves current index
        isDragging: false,
        isOpen: false,
        lastPanX: 0,
        lastPanY: 0,
        panX: 0,
        panY: 0,
        zoom: 1,
      });
    });
  });

  describe("navigatePhoto", () => {
    const currentState: LightboxState = {
      currentIndex: 2,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    };

    it("should navigate forward successfully", () => {
      const result = PhotoViewerService.navigatePhoto(currentState, 1, 5);

      expect(result.success).toBe(true);
      expect(result.newIndex).toBe(3);
      expect(result.error).toBeUndefined();
    });

    it("should navigate backward successfully", () => {
      const result = PhotoViewerService.navigatePhoto(currentState, -1, 5);

      expect(result.success).toBe(true);
      expect(result.newIndex).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it("should fail navigation beyond bounds", () => {
      const forwardResult = PhotoViewerService.navigatePhoto(
        { ...currentState, currentIndex: 4 },
        1,
        5,
      );

      expect(forwardResult.success).toBe(false);
      expect(forwardResult.newIndex).toBe(4);
      expect(forwardResult.error).toContain(
        "Cannot navigate beyond photo bounds",
      );

      const backwardResult = PhotoViewerService.navigatePhoto(
        { ...currentState, currentIndex: 0 },
        -1,
        5,
      );

      expect(backwardResult.success).toBe(false);
      expect(backwardResult.newIndex).toBe(0);
      expect(backwardResult.error).toContain(
        "Cannot navigate beyond photo bounds",
      );
    });
  });

  describe("applyNavigation", () => {
    const currentState: LightboxState = {
      currentIndex: 1,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 50,
      panY: 30,
      zoom: 2,
    };

    it("should apply successful navigation", () => {
      const navigationResult = { newIndex: 3, success: true };
      const newState = PhotoViewerService.applyNavigation(
        currentState,
        navigationResult,
      );

      expect(newState.currentIndex).toBe(3);
      expect(newState.panX).toBe(0);
      expect(newState.panY).toBe(0);
      expect(newState.zoom).toBe(1);
    });

    it("should not apply failed navigation", () => {
      const navigationResult = {
        error: "Cannot navigate",
        newIndex: 1,
        success: false,
      };
      const newState = PhotoViewerService.applyNavigation(
        currentState,
        navigationResult,
      );

      expect(newState).toEqual(currentState);
    });
  });

  describe("zoom operations", () => {
    const currentState: LightboxState = {
      currentIndex: 0,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 2,
    };

    describe("zoomIn", () => {
      it("should zoom in with default config", () => {
        const newState = PhotoViewerService.zoomIn(currentState);
        expect(newState.zoom).toBe(3); // 2 * 1.5
      });

      it("should respect max zoom limit", () => {
        const maxZoomedState = { ...currentState, zoom: 5 };
        const newState = PhotoViewerService.zoomIn(maxZoomedState);
        expect(newState.zoom).toBe(5); // Should not exceed maxZoom
      });

      it("should use custom config", () => {
        const config: ViewerConfig = {
          enableKeyboardNav: true,
          maxZoom: 3,
          minZoom: 0.5,
          zoomStep: 2,
        };
        const newState = PhotoViewerService.zoomIn(currentState, config);
        expect(newState.zoom).toBe(3); // min(2 * 2, 3) = 3
      });
    });

    describe("zoomOut", () => {
      it("should zoom out with default config", () => {
        const newState = PhotoViewerService.zoomOut(currentState);
        expect(newState.zoom).toBeCloseTo(1.33, 2); // 2 / 1.5
      });

      it("should reset pan when zoom reaches 1 or below", () => {
        const stateWithPan = { ...currentState, panX: 50, panY: 30, zoom: 1.5 };
        const newState = PhotoViewerService.zoomOut(stateWithPan);

        expect(newState.zoom).toBe(1); // 1.5 / 1.5
        expect(newState.panX).toBe(0);
        expect(newState.panY).toBe(0);
      });

      it("should respect min zoom limit", () => {
        const minZoomedState = { ...currentState, zoom: 0.5 };
        const newState = PhotoViewerService.zoomOut(minZoomedState);
        expect(newState.zoom).toBe(0.5); // Should not go below minZoom
      });
    });

    describe("resetZoom", () => {
      it("should reset zoom and pan to defaults", () => {
        const zoomedState = { ...currentState, panX: 100, panY: 50, zoom: 3 };
        const newState = PhotoViewerService.resetZoom(zoomedState);

        expect(newState.zoom).toBe(1);
        expect(newState.panX).toBe(0);
        expect(newState.panY).toBe(0);
      });
    });
  });

  describe("pan operations", () => {
    it("should set pan position when zoomed", () => {
      const zoomedState: LightboxState = {
        currentIndex: 0,
        isDragging: false,
        isOpen: true,
        lastPanX: 0,
        lastPanY: 0,
        panX: 0,
        panY: 0,
        zoom: 2,
      };

      const newState = PhotoViewerService.setPanPosition(zoomedState, 50, 30);
      expect(newState.panX).toBe(50);
      expect(newState.panY).toBe(30);
    });

    it("should not allow panning when not zoomed", () => {
      const normalState: LightboxState = {
        currentIndex: 0,
        isDragging: false,
        isOpen: true,
        lastPanX: 0,
        lastPanY: 0,
        panX: 0,
        panY: 0,
        zoom: 1,
      };

      const newState = PhotoViewerService.setPanPosition(normalState, 50, 30);
      expect(newState).toEqual(normalState);
    });
  });

  describe("dragging operations", () => {
    const state: LightboxState = {
      currentIndex: 0,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 25,
      panY: 15,
      zoom: 2,
    };

    it("should start dragging", () => {
      const newState = PhotoViewerService.startDragging(state);

      expect(newState.isDragging).toBe(true);
      expect(newState.lastPanX).toBe(25); // Should save current pan
      expect(newState.lastPanY).toBe(15);
    });

    it("should stop dragging", () => {
      const draggingState = { ...state, isDragging: true };
      const newState = PhotoViewerService.stopDragging(draggingState);

      expect(newState.isDragging).toBe(false);
    });
  });

  describe("handleKeyboardEvent", () => {
    const state: LightboxState = {
      currentIndex: 1,
      isDragging: false,
      isOpen: true,
      lastPanX: 0,
      lastPanY: 0,
      panX: 0,
      panY: 0,
      zoom: 1,
    };

    const createKeyEvent = (key: string): KeyboardEvent =>
      ({
        key,
        preventDefault: () => {},
      }) as KeyboardEvent;

    it("should handle Escape key", () => {
      const result = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("Escape"),
        state,
        5,
      );

      expect(result.action).toBe("close");
      expect(result.newState.isOpen).toBe(false);
      expect(result.shouldPreventDefault).toBe(true);
    });

    it("should handle arrow navigation", () => {
      const leftResult = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("ArrowLeft"),
        state,
        5,
      );
      expect(leftResult.action).toBe("navigate");
      expect(leftResult.newState.currentIndex).toBe(0);

      const rightResult = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("ArrowRight"),
        state,
        5,
      );
      expect(rightResult.action).toBe("navigate");
      expect(rightResult.newState.currentIndex).toBe(2);
    });

    it("should handle zoom keys", () => {
      const zoomInResult = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("+"),
        state,
        5,
      );
      expect(zoomInResult.action).toBe("zoom");
      expect(zoomInResult.newState.zoom).toBe(1.5);

      const zoomedState = { ...state, zoom: 2 };
      const zoomOutResult = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("-"),
        zoomedState,
        5,
      );
      expect(zoomOutResult.action).toBe("zoom");
      expect(zoomOutResult.newState.zoom).toBeCloseTo(1.33, 2);

      const resetResult = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("0"),
        zoomedState,
        5,
      );
      expect(resetResult.action).toBe("zoom");
      expect(resetResult.newState.zoom).toBe(1);
    });

    it("should ignore keys when lightbox closed", () => {
      const closedState = { ...state, isOpen: false };
      const result = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("ArrowLeft"),
        closedState,
        5,
      );

      expect(result.action).toBe("none");
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.newState).toEqual(closedState);
    });

    it("should ignore unknown keys", () => {
      const result = PhotoViewerService.handleKeyboardEvent(
        createKeyEvent("x"),
        state,
        5,
      );

      expect(result.action).toBe("none");
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.newState).toEqual(state);
    });
  });

  describe("utility methods", () => {
    it("should calculate image transform", () => {
      const state: LightboxState = {
        currentIndex: 0,
        isDragging: false,
        isOpen: true,
        lastPanX: 0,
        lastPanY: 0,
        panX: 50,
        panY: 30,
        zoom: 2,
      };

      const transform = PhotoViewerService.calculateImageTransform(state);
      expect(transform).toBe("scale(2) translate(50px, 30px)");
    });

    it("should get cursor style", () => {
      const normalState = { zoom: 1 } as LightboxState;
      const zoomedState = { zoom: 2 } as LightboxState;

      expect(PhotoViewerService.getCursorStyle(normalState)).toBe("default");
      expect(PhotoViewerService.getCursorStyle(zoomedState)).toBe("grab");
    });

    it("should format zoom percentage", () => {
      expect(PhotoViewerService.formatZoomPercentage(1)).toBe("100%");
      expect(PhotoViewerService.formatZoomPercentage(1.5)).toBe("150%");
      expect(PhotoViewerService.formatZoomPercentage(0.75)).toBe("75%");
    });
  });

  describe("validateConfig", () => {
    it("should validate correct config", () => {
      const config: ViewerConfig = {
        enableKeyboardNav: true,
        maxZoom: 5,
        minZoom: 0.5,
        zoomStep: 1.5,
      };

      expect(() => PhotoViewerService.validateConfig(config)).not.toThrow();
    });

    it("should throw error for invalid zoom bounds", () => {
      const config = {
        enableKeyboardNav: true,
        maxZoom: 0.5,
        minZoom: 1,
        zoomStep: 1.5,
      };

      expect(() => PhotoViewerService.validateConfig(config)).toThrow(
        "minZoom must be less than maxZoom",
      );
    });

    it("should throw error for invalid zoom step", () => {
      const config = {
        enableKeyboardNav: true,
        maxZoom: 5,
        minZoom: 0.5,
        zoomStep: 0.5,
      };

      expect(() => PhotoViewerService.validateConfig(config)).toThrow(
        "zoomStep must be greater than 1",
      );
    });

    it("should throw error for zero or negative minZoom", () => {
      const config = {
        enableKeyboardNav: true,
        maxZoom: 5,
        minZoom: 0,
        zoomStep: 1.5,
      };

      expect(() => PhotoViewerService.validateConfig(config)).toThrow(
        "minZoom must be greater than 0",
      );
    });
  });
});
