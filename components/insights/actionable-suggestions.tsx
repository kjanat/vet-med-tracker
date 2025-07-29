"use client";

import {
	ArrowRight,
	Check,
	Clock,
	Lightbulb,
	Shield,
	Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface Suggestion {
	id: string;
	type: "ADD_REMINDER" | "SHIFT_TIME" | "ENABLE_COSIGN";
	summary: string;
	rationale: string;
	action: {
		animalId?: string;
		regimenId?: string;
		targetTime?: string;
		dayOfWeek?: number;
		shiftMinutes?: number;
	};
}

// Mock data - replace with tRPC
const mockSuggestions: Suggestion[] = [
	{
		id: "suggest-1",
		type: "ADD_REMINDER",
		summary: "Add Friday morning reminder for Buddy",
		rationale: "Rimadyl is late 25% of the time on Friday mornings",
		action: {
			animalId: "1",
			regimenId: "rimadyl-1",
			targetTime: "08:00",
			dayOfWeek: 5,
		},
	},
	{
		id: "suggest-2",
		type: "SHIFT_TIME",
		summary: "Shift weekend insulin to 8:30 AM",
		rationale: "Whiskers' insulin is consistently 20+ minutes late on weekends",
		action: {
			animalId: "2",
			regimenId: "insulin-1",
			shiftMinutes: 30,
		},
	},
	{
		id: "suggest-3",
		type: "ENABLE_COSIGN",
		summary: "Enable co-sign for Buddy's pain medication",
		rationale:
			"Two caregivers recorded within 10 minutes twice in the last 14 days",
		action: {
			animalId: "1",
			regimenId: "pain-relief-1",
		},
	},
];

const suggestionIcons = {
	ADD_REMINDER: Clock,
	SHIFT_TIME: ArrowRight,
	ENABLE_COSIGN: Shield,
};

const suggestionColors = {
	ADD_REMINDER:
		"border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
	SHIFT_TIME:
		"border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950",
	ENABLE_COSIGN: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
};

export function ActionableSuggestions() {
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
		new Set(),
	);
	const [revertTimers, setRevertTimers] = useState<Map<string, NodeJS.Timeout>>(
		new Map(),
	);

	useEffect(() => {
		// TODO: Replace with tRPC query
		// const data = await insights.suggestions.query({
		//   householdId,
		//   range: { from: range.from, to: range.to }
		// })

		setSuggestions(mockSuggestions);
	}, []);

	const handleApplySuggestion = async (suggestion: Suggestion) => {
		try {
			console.log("Applying suggestion:", suggestion);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("insights_suggestion_apply", {
					detail: { suggestionId: suggestion.id, type: suggestion.type },
				}),
			);

			// TODO: Replace with tRPC mutation
			// await insights.applySuggestion.mutateAsync({ id: suggestion.id })

			// Mark as applied
			setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]));

			// Set up revert timer (10 minutes)
			const timer = setTimeout(
				() => {
					setAppliedSuggestions((prev) => {
						const next = new Set(prev);
						next.delete(suggestion.id);
						return next;
					});
					setRevertTimers((prev) => {
						const next = new Map(prev);
						next.delete(suggestion.id);
						return next;
					});
				},
				10 * 60 * 1000,
			);

			setRevertTimers((prev) => new Map([...prev, [suggestion.id, timer]]));

			// Show success message
			console.log(`Applied: ${suggestion.summary}`);

			// TODO: Invalidate relevant queries
			// queryClient.invalidateQueries(['regimens'])
			// queryClient.invalidateQueries(['notifications'])
		} catch (error) {
			console.error("Failed to apply suggestion:", error);
		}
	};

	const handleRevertSuggestion = async (suggestionId: string) => {
		try {
			console.log("Reverting suggestion:", suggestionId);

			// Clear timer
			const timer = revertTimers.get(suggestionId);
			if (timer) {
				clearTimeout(timer);
				setRevertTimers((prev) => {
					const next = new Map(prev);
					next.delete(suggestionId);
					return next;
				});
			}

			// TODO: Implement revert logic
			// This would need to store the original state and restore it

			setAppliedSuggestions((prev) => {
				const next = new Set(prev);
				next.delete(suggestionId);
				return next;
			});

			console.log("Suggestion reverted");
		} catch (error) {
			console.error("Failed to revert suggestion:", error);
		}
	};

	if (suggestions.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lightbulb className="h-5 w-5" />
						Suggestions
					</CardTitle>
					<CardDescription>
						AI-powered recommendations to improve compliance
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
						<h3 className="text-lg font-medium mb-2">All good!</h3>
						<p className="text-muted-foreground">
							No suggestions at this time. Keep up the great work!
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Lightbulb className="h-5 w-5" />
					Suggestions
				</CardTitle>
				<CardDescription>
					AI-powered recommendations to improve compliance
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{suggestions.map((suggestion) => {
					const Icon = suggestionIcons[suggestion.type];
					const isApplied = appliedSuggestions.has(suggestion.id);

					return (
						<Card
							key={suggestion.id}
							className={`${suggestionColors[suggestion.type]} ${isApplied ? "ring-2 ring-green-500" : ""}`}
						>
							<CardContent className="p-4">
								<div className="flex items-start gap-3">
									<Icon className="h-5 w-5 mt-0.5 shrink-0" />
									<div className="flex-1 space-y-2">
										<div>
											<div className="font-medium">{suggestion.summary}</div>
											<div className="text-sm text-muted-foreground">
												{suggestion.rationale}
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Badge variant="outline" className="text-xs">
												{suggestion.type.replace("_", " ").toLowerCase()}
											</Badge>
										</div>

										{isApplied ? (
											<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
												<Check className="h-4 w-4 text-green-600 dark:text-green-400" />
												<AlertDescription className="flex items-center justify-between">
													<span className="text-green-800 dark:text-green-200">
														Applied successfully!
													</span>
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleRevertSuggestion(suggestion.id)
														}
														className="gap-1"
													>
														<Undo2 className="h-3 w-3" />
														Revert
													</Button>
												</AlertDescription>
											</Alert>
										) : (
											<Button
												onClick={() => handleApplySuggestion(suggestion)}
												size="sm"
												className="w-full"
											>
												Apply Suggestion
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</CardContent>
		</Card>
	);
}
