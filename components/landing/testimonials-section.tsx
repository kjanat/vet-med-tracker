"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

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
		<section className="py-20 bg-muted/50">
			<div className="container max-w-6xl mx-auto px-4">
				{/* Section header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Loved by Pet Parents Everywhere
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Join thousands of pet parents who&apos;ve transformed how they
						manage their pets&apos; health.
					</p>
				</div>

				{/* Testimonials grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{testimonials.map((testimonial) => (
						<Card
							key={`testimonial-${testimonial.name.replace(/\s+/g, "-").toLowerCase()}`}
							className="hover:shadow-lg transition-shadow"
						>
							<CardContent className="p-6">
								{/* Rating stars */}
								<div className="flex gap-1 mb-4">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star
											key={`star-${testimonial.name}-${i}`}
											className="w-5 h-5 fill-primary text-primary"
										/>
									))}
								</div>

								{/* Quote */}
								<blockquote className="text-muted-foreground mb-6">
									&quot;{testimonial.content}&quot;
								</blockquote>

								{/* Author */}
								<div className="flex items-center gap-3">
									<Avatar>
										<AvatarFallback>{testimonial.avatar}</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-semibold">{testimonial.name}</p>
										<p className="text-sm text-muted-foreground">
											{testimonial.role}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* Stats */}
				<div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
					<div>
						<p className="text-4xl font-bold text-primary mb-2">10,000+</p>
						<p className="text-muted-foreground">Pet Parents</p>
					</div>
					<div>
						<p className="text-4xl font-bold text-primary mb-2">50,000+</p>
						<p className="text-muted-foreground">Pets Tracked</p>
					</div>
					<div>
						<p className="text-4xl font-bold text-primary mb-2">1M+</p>
						<p className="text-muted-foreground">Doses Recorded</p>
					</div>
					<div>
						<p className="text-4xl font-bold text-primary mb-2">99.9%</p>
						<p className="text-muted-foreground">Uptime</p>
					</div>
				</div>
			</div>
		</section>
	);
}
