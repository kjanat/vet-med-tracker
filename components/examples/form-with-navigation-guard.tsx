"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { buttonPatterns, cn } from "@/components/ui/class-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { NavigationGuardLink } from "@/components/ui/navigation-guard";
import { useNavigationGuard } from "@/hooks/shared/use-navigation-guard";

/**
 * Example form component demonstrating Next.js 15 navigation features:
 * - NavigationGuardLink with onNavigate prop
 * - useNavigationGuard hook for browser navigation
 * - LoadingIndicator with useLinkStatus
 */
const formSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof formSchema>;

export function FormWithNavigationGuard() {
	const [isSaved, setIsSaved] = useState(true);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
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

	const handleSave = async (data: FormData) => {
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
					{form.formState.errors.name && (
						<p className="mt-1 text-red-600 text-sm">
							{form.formState.errors.name.message}
						</p>
					)}
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
					{form.formState.errors.email && (
						<p className="mt-1 text-red-600 text-sm">
							{form.formState.errors.email.message}
						</p>
					)}
				</div>

				<div className="flex gap-4">
					<Button type="submit" disabled={!isDirty || isSaved}>
						Save Changes
					</Button>

					{/* NavigationGuardLink prevents navigation when there are unsaved changes */}
					<NavigationGuardLink
						href="/dashboard"
						hasUnsavedChanges={isDirty && !isSaved}
						className={cn(
							buttonPatterns.baseButton,
							buttonPatterns.secondaryButton,
						)}
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
