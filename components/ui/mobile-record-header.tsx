"use client";

import { ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Button } from "@/components/ui/button";

interface MobileRecordHeaderProps {
	step: "select" | "confirm" | "success";
	selectedAnimalName?: string;
	selectedMedication?: string;
	onBack?: () => void;
	onCancel?: () => void;
}

/**
 * Mobile-optimized header for medication recording
 * Provides clear navigation and context for the current step
 */
export function MobileRecordHeader({
	step,
	selectedAnimalName,
	selectedMedication,
	onBack,
	onCancel,
}: MobileRecordHeaderProps) {
	const router = useRouter();
	const { animals } = useApp();

	const selectedAnimal = selectedAnimalName
		? animals.find((a) => a.name === selectedAnimalName)
		: null;

	const stepTitles = {
		select: "Select Medication",
		confirm: "Confirm Administration",
		success: "Recording Complete",
	};

	const stepProgress = {
		select: 1,
		confirm: 2,
		success: 3,
	};

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else if (step === "select") {
			router.back();
		}
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		} else {
			router.push("/");
		}
	};

	return (
		<header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
			<div className="flex items-center justify-between px-4 py-3">
				{/* Left: Back/Cancel */}
				<div className="flex items-center gap-2">
					{step !== "select" ? (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleBack}
							className="h-10 w-10 p-0"
							aria-label="Go back"
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>
					) : (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleCancel}
							className="h-10 w-10 p-0"
							aria-label="Cancel and return to home"
						>
							<X className="h-5 w-5" />
						</Button>
					)}
				</div>

				{/* Center: Title and Context */}
				<div className="flex-1 text-center min-w-0 mx-4">
					<h1 className="text-lg font-semibold truncate">{stepTitles[step]}</h1>

					{/* Animal and medication context */}
					{selectedAnimalName && (
						<div className="flex items-center justify-center gap-2 mt-1">
							{selectedAnimal && (
								<AnimalAvatar
									animal={selectedAnimal}
									size="xs"
									className="shrink-0"
								/>
							)}
							<div className="min-w-0">
								<p className="text-sm text-muted-foreground truncate">
									{selectedAnimalName}
									{selectedMedication && ` • ${selectedMedication}`}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Right: Progress indicator */}
				<output
					className="flex items-center gap-1"
					aria-label={`Step ${stepProgress[step]} of 3`}
				>
					{[1, 2, 3].map((num) => (
						<div
							key={num}
							className={`h-2 w-2 rounded-full transition-colors ${
								num <= stepProgress[step]
									? "bg-primary"
									: "bg-muted-foreground/30"
							}`}
							aria-hidden="true"
						/>
					))}
				</output>
			</div>
		</header>
	);
}

/**
 * Quick stats bar for medication recording context
 * Shows important information like due count, compliance, etc.
 */
export function MobileRecordStats({
	dueCount = 0,
	overdueCount = 0,
	complianceRate = 0,
	className = "",
}: {
	dueCount?: number;
	overdueCount?: number;
	complianceRate?: number;
	className?: string;
}) {
	return (
		<div className={`bg-muted/50 border-b px-4 py-2 ${className}`}>
			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1">
						<div className="h-2 w-2 bg-green-600 rounded-full" />
						<span className="text-muted-foreground">Due: {dueCount}</span>
					</div>

					{overdueCount > 0 && (
						<div className="flex items-center gap-1">
							<div className="h-2 w-2 bg-red-600 rounded-full" />
							<span className="text-muted-foreground">
								Overdue: {overdueCount}
							</span>
						</div>
					)}
				</div>

				<div className="text-muted-foreground">
					{complianceRate}% compliance
				</div>
			</div>
		</div>
	);
}
