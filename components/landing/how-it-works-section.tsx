"use client";

import { CheckCircle2, Smartphone, Timer } from "lucide-react";
import { Section } from "./primitives/section";
import { SectionHeader } from "./primitives/section-header";

const steps = [
	{
		number: "1",
		title: "Add Your Pets",
		description:
			"Set up profiles for each of your pets with their medications and schedules.",
		icon: Smartphone,
	},
	{
		number: "2",
		title: "Get Reminded",
		description: "Receive smart notifications when it's time for medications.",
		icon: Timer,
	},
	{
		number: "3",
		title: "Record in 3 Taps",
		description: "Select pet, confirm medication, hold to record. That's it!",
		icon: CheckCircle2,
	},
];

export function HowItWorksSection() {
	return (
		<Section id="demo">
			<SectionHeader
				title="How It Works"
				description="Get started in minutes and never worry about missed medications again."
			/>

			{/* Steps */}
			<div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
				{steps.map((step, index) => (
					<div
						key={`step-${step.title.replace(/\s+/g, "-").toLowerCase()}`}
						className="relative"
					>
						{/* Connection line (hidden on mobile and last item) */}
						{index < steps.length - 1 && (
							<div className="absolute top-12 left-1/2 hidden h-0.5 w-full bg-border md:block" />
						)}

						<div className="relative text-center">
							{/* Step circle with icon */}
							<div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 hover:scale-110">
								<step.icon
									className="h-10 w-10 animate-pulse text-primary"
									style={{ animationDuration: "3s" }}
								/>
								{/* Step number badge */}
								<div className="-top-2 -right-2 absolute flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
									<span className="font-bold text-sm">{step.number}</span>
								</div>
							</div>

							{/* Content */}
							<h3 className="mb-2 font-semibold text-xl">{step.title}</h3>
							<p className="text-muted-foreground">{step.description}</p>
						</div>
					</div>
				))}
			</div>

			{/* Interactive demo */}
			<div className="rounded-2xl bg-muted/50 p-8 text-center">
				<h3 className="mb-4 font-semibold text-2xl">Try It Yourself</h3>
				<p className="mb-6 text-muted-foreground">
					Experience our 3-tap recording system with this interactive demo.
				</p>
				<div className="mx-auto max-w-md">
					{/* Demo placeholder */}
					<div className="space-y-4 rounded-lg bg-background p-6 shadow-lg">
						<div
							className="h-12 animate-pulse rounded bg-muted"
							style={{ animationDuration: "2s" }}
						/>
						<div
							className="h-12 animate-pulse rounded bg-muted"
							style={{ animationDuration: "2s", animationDelay: "200ms" }}
						/>
						<div
							className="h-12 animate-pulse rounded bg-muted"
							style={{ animationDuration: "2s", animationDelay: "400ms" }}
						/>
					</div>
				</div>
			</div>
		</Section>
	);
}
