"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "./content/stats-grid";
import { Section } from "./primitives/section";
import { SectionHeader } from "./primitives/section-header";

const testimonials = [
	{
		name: "Sarah M.",
		role: "Dog Mom to Max & Luna",
		content:
			"This app saved my sanity! With two dogs on different medications, I was constantly worried about mixing things up. Now everything is organized and I get reminders right when I need them.",
		rating: 5,
		avatar: "SM",
	},
	{
		name: "Dr. James Wilson",
		role: "Veterinarian",
		content:
			"I recommend VetMed Tracker to all my clients with pets on regular medications. The compliance rates have improved dramatically, and the emergency card feature has been a lifesaver.",
		rating: 5,
		avatar: "JW",
	},
	{
		name: "Emily Chen",
		role: "Foster Parent",
		content:
			"Managing medications for multiple foster cats used to be a nightmare. This app makes it so easy to track who gets what and when. The household feature is perfect for our rescue group.",
		rating: 5,
		avatar: "EC",
	},
];

export function TestimonialsSection() {
	return (
		<Section variant="muted">
			<SectionHeader
				title="Loved by Pet Parents Everywhere"
				description="Join thousands of pet parents who've transformed how they manage their pets' health."
			/>

			{/* Testimonials grid */}
			<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
				{testimonials.map((testimonial) => (
					<Card
						key={`testimonial-${testimonial.name.replace(/\s+/g, "-").toLowerCase()}`}
						className="transition-shadow hover:shadow-lg"
					>
						<CardContent className="p-6">
							{/* Rating stars */}
							<div className="mb-4 flex gap-1">
								{[...Array(testimonial.rating)].map((_, i) => (
									<Star
										key={`star-${testimonial.name}-${i}`}
										className="h-5 w-5 fill-primary text-primary"
									/>
								))}
							</div>

							{/* Quote */}
							<blockquote className="mb-6 text-muted-foreground">
								"{testimonial.content}"
							</blockquote>

							{/* Author */}
							<div className="flex items-center gap-3">
								<Avatar>
									<AvatarFallback>{testimonial.avatar}</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-semibold">{testimonial.name}</p>
									<p className="text-muted-foreground text-sm">
										{testimonial.role}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Stats */}
			<StatsGrid
				className="mt-16"
				stats={[
					{ value: "10,000+", label: "Pet Parents", highlight: true },
					{ value: "50,000+", label: "Pets Tracked", highlight: true },
					{ value: "1M+", label: "Doses Recorded", highlight: true },
					{ value: "99.9%", label: "Uptime", highlight: true },
				]}
			/>
		</Section>
	);
}
