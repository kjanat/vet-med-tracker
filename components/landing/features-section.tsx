"use client";

import { Activity, Bell, Package, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
	{
		title: "3-Tap Recording",
		description:
			"Record medications in seconds with our patented 3-tap system. Select, confirm, done.",
		icon: Activity,
		color: "text-green-600",
		bgColor: "bg-green-500/10",
	},
	{
		title: "Multi-Pet Management",
		description:
			"Track medications for all your pets in one place. Perfect for multi-pet households.",
		icon: Users,
		color: "text-blue-600",
		bgColor: "bg-blue-500/10",
	},
	{
		title: "Smart Reminders",
		description:
			"Never miss a dose with intelligent reminders that escalate to ensure compliance.",
		icon: Bell,
		color: "text-purple-600",
		bgColor: "bg-purple-500/10",
	},
	{
		title: "Inventory Tracking",
		description:
			"Know when to refill with automatic inventory tracking and low-stock alerts.",
		icon: Package,
		color: "text-orange-600",
		bgColor: "bg-orange-500/10",
	},
];

export function FeaturesSection() {
	return (
		<section id="features" className="bg-muted/50 py-20">
			<div className="container mx-auto max-w-6xl px-4">
				{/* Section header */}
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-3xl md:text-4xl">
						Everything You Need for Peace of Mind
					</h2>
					<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
						Built by pet parents, for pet parents. Every feature designed to
						make medication management effortless.
					</p>
				</div>

				{/* Features grid */}
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
					{features.map((feature) => (
						<Card
							key={`feature-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}
							className="p-6 transition-shadow hover:shadow-lg"
						>
							<div className="flex items-start gap-4">
								<div
									className={`h-12 w-12 rounded-lg ${feature.bgColor} flex flex-shrink-0 items-center justify-center`}
								>
									<feature.icon className={`h-6 w-6 ${feature.color}`} />
								</div>
								<div>
									<h3 className="mb-2 font-semibold text-xl">
										{feature.title}
									</h3>
									<p className="text-muted-foreground">{feature.description}</p>
								</div>
							</div>
						</Card>
					))}
				</div>

				{/* Visual showcase */}
				<div className="relative mt-20">
					<div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-3xl" />
					<div className="relative rounded-2xl bg-background p-8 shadow-2xl">
						<div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
							{/* Placeholder for app screenshot or demo video */}
							<div className="text-center">
								<Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
								<p className="text-muted-foreground">
									App Screenshot/Demo Video
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
