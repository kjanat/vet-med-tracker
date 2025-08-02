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
		<section id="features" className="py-20 bg-muted/50">
			<div className="container max-w-6xl mx-auto px-4">
				{/* Section header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Everything You Need for Peace of Mind
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Built by pet parents, for pet parents. Every feature designed to
						make medication management effortless.
					</p>
				</div>

				{/* Features grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{features.map((feature) => (
						<Card
							key={`feature-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}
							className="p-6 hover:shadow-lg transition-shadow"
						>
							<div className="flex items-start gap-4">
								<div
									className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center flex-shrink-0`}
								>
									<feature.icon className={`w-6 h-6 ${feature.color}`} />
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-2">
										{feature.title}
									</h3>
									<p className="text-muted-foreground">{feature.description}</p>
								</div>
							</div>
						</Card>
					))}
				</div>

				{/* Visual showcase */}
				<div className="mt-20 relative">
					<div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-3xl" />
					<div className="relative bg-background rounded-2xl shadow-2xl p-8">
						<div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
							{/* Placeholder for app screenshot or demo video */}
							<div className="text-center">
								<Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
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
