"use client";

import { CheckCircle2, Smartphone, Timer } from "lucide-react";

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
		<section id="demo" className="py-20">
			<div className="container mx-auto max-w-6xl px-4">
				{/* Section header */}
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-3xl md:text-4xl">How It Works</h2>
					<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
						Get started in minutes and never worry about missed medications
						again.
					</p>
				</div>

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
								<div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
									<step.icon className="h-10 w-10 text-primary" />
									{/* Step number badge */}
									<div className="-top-2 -right-2 absolute flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
							<div className="h-12 animate-pulse rounded bg-muted" />
							<div className="h-12 animate-pulse rounded bg-muted [animation-delay:75ms]" />
							<div className="h-12 animate-pulse rounded bg-muted [animation-delay:150ms]" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
