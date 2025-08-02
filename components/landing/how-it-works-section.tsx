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
			<div className="container max-w-6xl mx-auto px-4">
				{/* Section header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Get started in minutes and never worry about missed medications
						again.
					</p>
				</div>

				{/* Steps */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
					{steps.map((step, index) => (
						<div
							key={`step-${step.title.replace(/\s+/g, "-").toLowerCase()}`}
							className="relative"
						>
							{/* Connection line (hidden on mobile and last item) */}
							{index < steps.length - 1 && (
								<div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-border" />
							)}

							<div className="relative text-center">
								{/* Step number */}
								<div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 relative">
									<span className="text-4xl font-bold text-primary">
										{step.number}
									</span>
									<div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
								</div>

								{/* Icon */}
								<div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center mx-auto -mt-20 mb-6">
									<step.icon className="w-6 h-6 text-primary" />
								</div>

								{/* Content */}
								<h3 className="text-xl font-semibold mb-2">{step.title}</h3>
								<p className="text-muted-foreground">{step.description}</p>
							</div>
						</div>
					))}
				</div>

				{/* Interactive demo */}
				<div className="bg-muted/50 rounded-2xl p-8 text-center">
					<h3 className="text-2xl font-semibold mb-4">Try It Yourself</h3>
					<p className="text-muted-foreground mb-6">
						Experience our 3-tap recording system with this interactive demo.
					</p>
					<div className="max-w-md mx-auto">
						{/* Demo placeholder */}
						<div className="bg-background rounded-lg shadow-lg p-6 space-y-4">
							<div className="h-12 bg-muted rounded animate-pulse" />
							<div className="h-12 bg-muted rounded animate-pulse delay-75" />
							<div className="h-12 bg-muted rounded animate-pulse delay-150" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
