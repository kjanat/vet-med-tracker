"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MedConfirmButtonProps {
	onConfirm: () => void;
	disabled?: boolean;
	requiresCoSign?: boolean;
	className?: string;
	children: React.ReactNode;
}

export function MedConfirmButton({
	onConfirm,
	disabled = false,
	requiresCoSign = false,
	className,
	children,
}: MedConfirmButtonProps) {
	const [isHolding, setIsHolding] = useState(false);
	const [progress, setProgress] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout>();
	const intervalRef = useRef<NodeJS.Timeout>();
	const startTimeRef = useRef<number>();

	const HOLD_DURATION = 3000; // 3 seconds

	const startHold = () => {
		if (disabled || isComplete) return;

		setIsHolding(true);
		setProgress(0);
		startTimeRef.current = Date.now();

		// Progress animation
		intervalRef.current = setInterval(() => {
			const elapsed = Date.now() - (startTimeRef.current || 0);
			const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
			setProgress(newProgress);
		}, 16); // ~60fps

		// Complete after hold duration
		timeoutRef.current = setTimeout(() => {
			setIsComplete(true);
			setIsHolding(false);
			setProgress(100);
			onConfirm();

			// Reset after brief delay
			setTimeout(() => {
				setIsComplete(false);
				setProgress(0);
			}, 1000);
		}, HOLD_DURATION);
	};

	const cancelHold = () => {
		setIsHolding(false);
		setProgress(0);

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<div className="relative">
			<Button
				type="button"
				className={cn(
					"relative overflow-hidden transition-all duration-200",
					isHolding && "scale-95",
					isComplete && "bg-green-600 hover:bg-green-600",
					requiresCoSign && "bg-orange-600 hover:bg-orange-700",
					className,
				)}
				disabled={disabled}
				onPointerDown={startHold}
				onPointerUp={cancelHold}
				onPointerLeave={cancelHold}
				onTouchStart={startHold}
				onTouchEnd={cancelHold}
				aria-label={`Hold to confirm${requiresCoSign ? " (requires co-sign)" : ""}`}
				aria-pressed={isHolding}
			>
				{/* Progress bar background */}
				<div
					className="absolute inset-0 bg-white/20 transition-transform duration-75 ease-out origin-left"
					style={{
						transform: `scaleX(${progress / 100})`,
					}}
				/>

				{/* Button content */}
				<span className="relative z-10 flex items-center justify-center gap-2">
					{isComplete ? (
						<>
							<span className="text-lg">✓</span>
							Recorded!
						</>
					) : (
						children
					)}
				</span>
			</Button>

			{/* Progress indicator */}
			{isHolding && (
				<div className="absolute -bottom-1 left-0 right-0 h-1 bg-background rounded-full overflow-hidden">
					<div
						className="h-full bg-primary transition-transform duration-75 ease-out origin-left"
						style={{
							transform: `scaleX(${progress / 100})`,
						}}
					/>
				</div>
			)}
		</div>
	);
}
