"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { NavigationGuardLink } from "@/components/ui/navigation-guard";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

/**
 * Example form component demonstrating Next.js 15 navigation features:
 * - NavigationGuardLink with onNavigate prop
 * - useNavigationGuard hook for browser navigation
 * - LoadingIndicator with useLinkStatus
 */
export function FormWithNavigationGuard() {
	const [isSaved, setIsSaved] = useState(true);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
		},
	});

	const isDirty = form.formState.isDirty;

	// Prevent browser navigation when form has unsaved changes
	useNavigationGuard({
		enabled: isDirty && !isSaved,
		message: "You have unsaved form data. Do you want to leave without saving?",
	});

	const handleSave = async (data: { name: string; email: string }) => {
		// Simulate saving
		await new Promise((resolve) => setTimeout(resolve, 1000));
		setIsSaved(true);
		form.reset(data);
		console.log("Form saved:", data);
	};

	return (
		<div className="space-y-6">
			<form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
				<div>
					<Label htmlFor="name">Name</Label>
					<Input
						id="name"
						{...form.register("name", {
							onChange: () => setIsSaved(false),
						})}
						placeholder="Enter your name"
					/>
				</div>

				<div>
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						{...form.register("email", {
							onChange: () => setIsSaved(false),
						})}
						placeholder="Enter your email"
					/>
				</div>

				<div className="flex gap-4">
					<Button type="submit" disabled={!isDirty || isSaved}>
						Save Changes
					</Button>

					{/* NavigationGuardLink prevents navigation when there are unsaved changes */}
					<NavigationGuardLink
						href="/dashboard"
						hasUnsavedChanges={isDirty && !isSaved}
						className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 py-2 font-medium text-secondary-foreground text-sm ring-offset-background transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
					>
						Cancel
						<LoadingIndicator />
					</NavigationGuardLink>
				</div>
			</form>

			{isDirty && !isSaved && (
				<div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
					⚠️ You have unsaved changes. Navigation will prompt for confirmation.
				</div>
			)}
		</div>
	);
}
