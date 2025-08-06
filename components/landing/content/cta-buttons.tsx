"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CtaButtonsProps {
	className?: string;
	variant?: "primary" | "hero";
	showSecondary?: boolean;
}

export function CtaButtons({
	className,
	variant = "primary",
	showSecondary = true,
}: CtaButtonsProps) {
	const { openSignIn } = useClerk();
	const { user, isLoaded } = useUser();

	return (
		<div
			className={cn(
				"flex flex-col justify-center gap-4 sm:flex-row",
				className,
			)}
		>
			{isLoaded && !user && (
				<Button size="lg" className="px-8 text-lg" onClick={() => openSignIn()}>
					{variant === "hero" ? "Start Free" : "Get Started Free"}
					<ArrowRight className="ml-2 h-5 w-5" />
				</Button>
			)}
			{isLoaded && user && (
				<Button size="lg" className="px-8 text-lg" asChild>
					<Link href="/dashboard">
						Go to Dashboard
						<ArrowRight className="ml-2 h-5 w-5" />
					</Link>
				</Button>
			)}
			{showSecondary && (
				<Button size="lg" variant="outline" className="px-8 text-lg" asChild>
					<Link href={variant === "hero" ? "#demo" : "/help"}>
						{variant === "hero" ? "See How It Works" : "Questions? Contact Us"}
					</Link>
				</Button>
			)}
		</div>
	);
}
