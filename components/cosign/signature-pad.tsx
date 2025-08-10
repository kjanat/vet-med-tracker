"use client";

import { Eraser, PenTool, RotateCcw, Save } from "lucide-react";
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
	const [canvasSize, setCanvasSize] = useState({ width, height });

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
					width: maxWidth,
					height: Math.max(newHeight, 150), // Minimum height
				});
			}
		};

		updateCanvasSize();
		window.addEventListener("resize", updateCanvasSize);
		return () => window.removeEventListener("resize", updateCanvasSize);
	}, [width, height]);

	// Get coordinates relative to canvas
	const getCoordinates = useCallback(
		(event: MouseEvent | TouchEvent): Point | null => {
			const canvas = canvasRef.current;
			if (!canvas) return null;

			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;

			let clientX: number;
			let clientY: number;
			let pressure = 0.5;

			if (event.type.startsWith("touch")) {
				const touchEvent = event as TouchEvent;
				if (touchEvent.touches.length === 0) return null;
				clientX = touchEvent.touches[0]?.clientX || 0;
				clientY = touchEvent.touches[0]?.clientY || 0;
				// Many browsers support pressure on touch events
				pressure = (touchEvent.touches[0] as any).force || 0.5;
			} else {
				const mouseEvent = event as MouseEvent;
				clientX = mouseEvent.clientX;
				clientY = mouseEvent.clientY;
				// Some browsers support pressure on pointer events
				pressure = (mouseEvent as any).pressure || 0.5;
			}

			return {
				x: (clientX - rect.left) * scaleX,
				y: (clientY - rect.top) * scaleY,
				pressure,
				timestamp: Date.now(),
			};
		},
		[],
	);

	// Draw on canvas
	const drawStroke = useCallback((stroke: Stroke) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx || stroke.points.length === 0) return;

		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = stroke.width;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		ctx.beginPath();

		if (stroke.points.length === 1) {
			// Single point - draw a dot
			const point = stroke.points[0];
			if (point) {
				ctx.arc(point.x, point.y, stroke.width / 2, 0, 2 * Math.PI);
				ctx.fill();
			}
		} else {
			// Multiple points - draw smooth curve
			const firstPoint = stroke.points[0];
			if (firstPoint) {
				ctx.moveTo(firstPoint.x, firstPoint.y);
			}

			for (let i = 1; i < stroke.points.length - 2; i++) {
				const currentPoint = stroke.points[i];
				const nextPoint = stroke.points[i + 1];
				if (currentPoint && nextPoint) {
					const xc = (currentPoint.x + nextPoint.x) / 2;
					const yc = (currentPoint.y + nextPoint.y) / 2;
					ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, xc, yc);
				}
			}

			if (stroke.points.length >= 2) {
				const lastPoint = stroke.points[stroke.points.length - 1];
				const secondLastPoint = stroke.points[stroke.points.length - 2];
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
		}
	}, []);

	// Redraw entire canvas
	const redrawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, canvas?.width || 0, canvas?.height || 0);

		// Draw all strokes
		strokes.forEach((stroke) => drawStroke(stroke));

		// Draw current stroke if drawing
		if (isDrawing && currentStroke.length > 0) {
			drawStroke({
				points: currentStroke,
				color: penColor,
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

		canvas.width = canvasSize.width;
		canvas.height = canvasSize.height;
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
	}, [strokes, exportSignature, onSignatureChange]);

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
					points: currentStroke,
					color: penColor,
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
							ref={canvasRef}
							className={cn(
								"cursor-crosshair touch-none rounded-md border border-border bg-background",
								disabled && "cursor-not-allowed opacity-50",
							)}
							style={{
								width: canvasSize.width,
								height: canvasSize.height,
							}}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
							onTouchStart={handleTouchStart}
							onTouchMove={handleTouchMove}
							onTouchEnd={handleTouchEnd}
							onTouchCancel={handleTouchEnd}
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
						variant="outline"
						size="sm"
						onClick={undoStroke}
						disabled={disabled || strokes.length === 0}
						className="flex items-center gap-2"
					>
						<RotateCcw className="h-4 w-4" />
						Undo
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={clearSignature}
						disabled={disabled || isEmpty}
						className="flex items-center gap-2"
					>
						<Eraser className="h-4 w-4" />
						Clear
					</Button>

					<Button
						variant="outline"
						size="sm"
						disabled={isEmpty}
						className="flex items-center gap-2"
						title={isEmpty ? "No signature to save" : "Signature ready"}
					>
						<Save className="h-4 w-4" />
						{isEmpty ? "No Signature" : "Signature Ready"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
