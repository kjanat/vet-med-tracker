"use client";

import { Eraser, PenTool, RotateCcw, Save } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/general";

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  className?: string;
  disabled?: boolean;
  width?: number;
  height?: number;
  penColor?: string;
  penWidth?: number;
  backgroundColor?: string;
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export function SignaturePad({
  onSignatureChange,
  className,
  disabled = false,
  width = 400,
  height = 200,
  penColor = "#000000",
  penWidth = 2,
  backgroundColor = "#ffffff",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ height, width });

  // Responsive canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (typeof window !== "undefined") {
        const screenWidth = window.innerWidth;
        const containerPadding = 32; // Account for container padding
        const maxWidth = Math.min(width, screenWidth - containerPadding);
        const aspectRatio = height / width;
        const newHeight = maxWidth * aspectRatio;

        setCanvasSize({
          height: Math.max(newHeight, 150), // Minimum height
          width: maxWidth,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [width, height]);

  // Helper to extract client coordinates and pressure from touch event
  const getTouchEventData = useCallback(
    (
      touchEvent: TouchEvent,
    ): { clientX: number; clientY: number; pressure: number } | null => {
      if (touchEvent.touches.length === 0) return null;

      const touch = touchEvent.touches[0];
      return {
        clientX: touch?.clientX || 0,
        clientY: touch?.clientY || 0,
        pressure: typeof touch?.force === "number" ? touch.force : 0.5,
      };
    },
    [],
  );

  // Helper to extract client coordinates and pressure from mouse event
  const getMouseEventData = useCallback(
    (
      mouseEvent: MouseEvent,
    ): { clientX: number; clientY: number; pressure: number } => {
      let pressure = 0.5;

      if (window.PointerEvent && mouseEvent instanceof PointerEvent) {
        pressure = mouseEvent.pressure || 0.5;
      }

      return {
        clientX: mouseEvent.clientX,
        clientY: mouseEvent.clientY,
        pressure,
      };
    },
    [],
  );

  // Helper to calculate canvas scaling factors
  const getCanvasScaling = useCallback(
    (
      canvas: HTMLCanvasElement,
    ): { scaleX: number; scaleY: number; rect: DOMRect } => {
      const rect = canvas.getBoundingClientRect();
      return {
        rect,
        scaleX: canvas.width / rect.width,
        scaleY: canvas.height / rect.height,
      };
    },
    [],
  );

  // Get coordinates relative to canvas
  const getCoordinates = useCallback(
    (event: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const { rect, scaleX, scaleY } = getCanvasScaling(canvas);

      let eventData: {
        clientX: number;
        clientY: number;
        pressure: number;
      } | null;

      if (event.type.startsWith("touch")) {
        eventData = getTouchEventData(event as TouchEvent);
      } else {
        eventData = getMouseEventData(event as MouseEvent);
      }

      if (!eventData) return null;

      return {
        pressure: eventData.pressure,
        timestamp: Date.now(),
        x: (eventData.clientX - rect.left) * scaleX,
        y: (eventData.clientY - rect.top) * scaleY,
      };
    },
    [getCanvasScaling, getMouseEventData, getTouchEventData],
  );

  // Draw single point as dot
  const drawSinglePoint = useCallback(
    (ctx: CanvasRenderingContext2D, point: Point, stroke: Stroke) => {
      ctx.fillStyle = stroke.color;
      ctx.arc(point.x, point.y, stroke.width / 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  // Draw smooth curve through multiple points
  const drawSmoothCurve = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[]) => {
      const firstPoint = points[0];
      if (firstPoint) {
        ctx.moveTo(firstPoint.x, firstPoint.y);
      }

      // Draw quadratic curves between points
      for (let i = 1; i < points.length - 2; i++) {
        const currentPoint = points[i];
        const nextPoint = points[i + 1];
        if (currentPoint && nextPoint) {
          const xc = (currentPoint.x + nextPoint.x) / 2;
          const yc = (currentPoint.y + nextPoint.y) / 2;
          ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, xc, yc);
        }
      }

      // Draw final curve to last point
      if (points.length >= 2) {
        const lastPoint = points[points.length - 1];
        const secondLastPoint = points[points.length - 2];
        if (lastPoint && secondLastPoint) {
          ctx.quadraticCurveTo(
            secondLastPoint.x,
            secondLastPoint.y,
            lastPoint.x,
            lastPoint.y,
          );
        }
      }

      ctx.stroke();
    },
    [],
  );

  // Setup canvas context for drawing
  const setupCanvasContext = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
    },
    [],
  );

  // Draw on canvas
  const drawStroke = useCallback(
    (stroke: Stroke) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || stroke.points.length === 0) return;

      setupCanvasContext(ctx, stroke);

      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        if (point) {
          drawSinglePoint(ctx, point, stroke);
        }
      } else {
        drawSmoothCurve(ctx, stroke.points);
      }
    },
    [setupCanvasContext, drawSinglePoint, drawSmoothCurve],
  );

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas?.width || 0, canvas?.height || 0);

    // Draw all strokes
    strokes.forEach((stroke) => {
      drawStroke(stroke);
    });

    // Draw current stroke if drawing
    if (isDrawing && currentStroke.length > 0) {
      drawStroke({
        color: penColor,
        points: currentStroke,
        width: penWidth,
      });
    }
  }, [
    strokes,
    currentStroke,
    isDrawing,
    drawStroke,
    backgroundColor,
    penColor,
    penWidth,
  ]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // HiDPI/Retina clarity: scale backing store and transform context
    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redrawCanvas();
  }, [canvasSize, redrawCanvas]);

  // Redraw when strokes change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Export signature as base64
  const exportSignature = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return null;

    return canvas.toDataURL("image/png");
  }, [isEmpty]);

  // Update signature when strokes change
  useEffect(() => {
    const signature = exportSignature();
    onSignatureChange(signature);
  }, [exportSignature, onSignatureChange]);

  // Start drawing
  const startDrawing = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (disabled) return;

      event.preventDefault();
      const point = getCoordinates(event);
      if (!point) return;

      setIsDrawing(true);
      setCurrentStroke([point]);
      setIsEmpty(false);
    },
    [disabled, getCoordinates],
  );

  // Continue drawing
  const continueDrawing = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled) return;

      event.preventDefault();
      const point = getCoordinates(event);
      if (!point) return;

      setCurrentStroke((prev) => [...prev, point]);
    },
    [isDrawing, disabled, getCoordinates],
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentStroke.length > 0) {
      setStrokes((prev) => [
        ...prev,
        {
          color: penColor,
          points: currentStroke,
          width: penWidth,
        },
      ]);
    }

    setCurrentStroke([]);
  }, [isDrawing, currentStroke, penColor, penWidth]);

  // Clear signature
  const clearSignature = useCallback(() => {
    if (disabled) return;

    setStrokes([]);
    setCurrentStroke([]);
    setIsDrawing(false);
    setIsEmpty(true);
    onSignatureChange(null);
  }, [disabled, onSignatureChange]);

  // Undo last stroke
  const undoStroke = useCallback(() => {
    if (disabled || strokes.length === 0) return;

    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);

    if (newStrokes.length === 0) {
      setIsEmpty(true);
    }
  }, [disabled, strokes]);

  // Mouse event handlers
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    startDrawing(event.nativeEvent);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    continueDrawing(event.nativeEvent);
  };

  const handleMouseUp = () => {
    stopDrawing();
  };

  // Touch event handlers
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    startDrawing(event.nativeEvent);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    continueDrawing(event.nativeEvent);
  };

  const handleTouchEnd = () => {
    stopDrawing();
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          Digital Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-lg border-2 border-muted-foreground/25 border-dashed p-2">
            <canvas
              className={cn(
                "cursor-crosshair touch-none rounded-md border border-border bg-background",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchCancel={handleTouchEnd}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchStart}
              ref={canvasRef}
              style={{
                height: canvasSize.height,
                width: canvasSize.width,
              }}
            />
          </div>

          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              {disabled
                ? "Signature pad is disabled"
                : "Sign above using your mouse or finger"}
            </p>
            {!isEmpty && (
              <p className="mt-1 text-muted-foreground text-xs">
                Signature captured successfully
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            className="flex items-center gap-2"
            disabled={disabled || strokes.length === 0}
            onClick={undoStroke}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
            Undo
          </Button>

          <Button
            className="flex items-center gap-2"
            disabled={disabled || isEmpty}
            onClick={clearSignature}
            size="sm"
            variant="outline"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </Button>

          <Button
            className="flex items-center gap-2"
            disabled={isEmpty}
            size="sm"
            title={isEmpty ? "No signature to save" : "Signature ready"}
            variant="outline"
          >
            <Save className="h-4 w-4" />
            {isEmpty ? "No Signature" : "Signature Ready"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
