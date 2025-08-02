"use client";

import {
	BookOpen,
	Bug,
	Clock,
	FileQuestion,
	Lightbulb,
	Mail,
	MessageCircle,
	Shield,
	Smartphone,
	Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function HelpPage() {
	const helpCategories = [
		{
			icon: BookOpen,
			title: "Getting Started",
			description: "Learn the basics of VetMed Tracker",
			links: [
				{ label: "Quick Start Guide", href: "#quick-start" },
				{
					label: "Creating Your First Medication Schedule",
					href: "#first-schedule",
				},
				{ label: "Adding Caregivers", href: "#add-caregivers" },
			],
		},
		{
			icon: Smartphone,
			title: "Using the App",
			description: "Tips and tricks for daily use",
			links: [
				{ label: "Recording Medications", href: "#recording" },
				{ label: "Setting Up Reminders", href: "#reminders" },
				{ label: "Working Offline", href: "#offline" },
			],
		},
		{
			icon: Shield,
			title: "Account & Security",
			description: "Manage your account and data",
			links: [
				{ label: "Account Settings", href: "#account" },
				{ label: "Data Privacy", href: "/privacy" },
				{ label: "Household Management", href: "#households" },
			],
		},
		{
			icon: Bug,
			title: "Troubleshooting",
			description: "Solutions to common issues",
			links: [
				{ label: "Sync Issues", href: "#sync" },
				{ label: "Notification Problems", href: "#notifications" },
				{ label: "Login Issues", href: "#login" },
			],
		},
	];

	const contactMethods = [
		{
			icon: Mail,
			title: "Email Support",
			description: "Get help via email within 24 hours",
			action: "support@vetmedtracker.com",
			href: "mailto:support@vetmedtracker.com",
		},
		{
			icon: MessageCircle,
			title: "Live Chat",
			description: "Chat with our support team",
			action: "Start Chat",
			href: "#chat",
		},
		{
			icon: FileQuestion,
			title: "FAQ",
			description: "Find answers to common questions",
			action: "View FAQ",
			href: "/faq",
		},
		{
			icon: Users,
			title: "Community Forum",
			description: "Connect with other pet parents",
			action: "Visit Forum",
			href: "#forum",
		},
	];

	return (
		<div className="container max-w-6xl mx-auto px-4 py-12">
			<div className="text-center mb-12">
				<h1 className="text-4xl font-bold mb-4">How Can We Help?</h1>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Find answers, get support, and learn how to make the most of VetMed
					Tracker
				</p>
			</div>

			{/* Search Section */}
			<div className="max-w-2xl mx-auto mb-12">
				<div className="relative">
					<input
						type="search"
						placeholder="Search for help..."
						className="w-full px-4 py-3 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<button
						type="button"
						className="absolute right-3 top-1/2 -translate-y-1/2"
						aria-label="Search"
					>
						<svg
							className="w-5 h-5 text-muted-foreground"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Help Categories */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
				{helpCategories.map((category) => {
					const Icon = category.icon;
					return (
						<Card key={category.title}>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
										<Icon className="w-5 h-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-xl">{category.title}</CardTitle>
										<CardDescription>{category.description}</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2">
									{category.links.map((link) => (
										<li key={link.label}>
											<Link
												href={link.href}
												className="text-primary hover:underline hover:text-primary/80 transition-colors"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Quick Answers */}
			<section className="mb-16">
				<h2 className="text-2xl font-semibold mb-6 text-center">
					Quick Answers
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="text-center p-6">
						<Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
						<h3 className="font-semibold mb-2">3-Tap Recording</h3>
						<p className="text-sm text-muted-foreground">
							Select medication, hold button for 3 seconds, done! It&apos;s that
							simple.
						</p>
					</div>
					<div className="text-center p-6">
						<Smartphone className="w-12 h-12 mx-auto mb-4 text-primary" />
						<h3 className="font-semibold mb-2">Works Offline</h3>
						<p className="text-sm text-muted-foreground">
							Record medications without internet. Data syncs automatically when
							reconnected.
						</p>
					</div>
					<div className="text-center p-6">
						<Users className="w-12 h-12 mx-auto mb-4 text-primary" />
						<h3 className="font-semibold mb-2">Multiple Caregivers</h3>
						<p className="text-sm text-muted-foreground">
							Share care responsibilities with family members or pet sitters.
						</p>
					</div>
				</div>
			</section>

			{/* Contact Support */}
			<section>
				<h2 className="text-2xl font-semibold mb-6 text-center">
					Still Need Help?
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{contactMethods.map((method) => {
						const Icon = method.icon;
						return (
							<Card
								key={method.title}
								className="text-center hover:shadow-lg transition-shadow"
							>
								<CardContent className="pt-6">
									<Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
									<h3 className="font-semibold mb-2">{method.title}</h3>
									<p className="text-sm text-muted-foreground mb-4">
										{method.description}
									</p>
									<Button asChild variant="outline" className="w-full">
										<Link href={method.href}>{method.action}</Link>
									</Button>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>

			{/* Emergency Support */}
			<div className="mt-12 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
				<h3 className="font-semibold mb-2">Emergency Veterinary Help</h3>
				<p className="text-sm mb-4">
					For medical emergencies, contact your veterinarian immediately or
					visit the nearest emergency animal hospital.
				</p>
				<p className="text-sm">
					<strong>Pet Poison Helpline:</strong>{" "}
					<a href="tel:855-764-7661" className="text-primary hover:underline">
						(855) 764-7661
					</a>
				</p>
			</div>

			{/* Feedback Section */}
			<div className="mt-12 p-6 bg-primary/5 rounded-lg text-center">
				<Lightbulb className="w-12 h-12 mx-auto mb-4 text-primary" />
				<h3 className="font-semibold mb-2">Have a Suggestion?</h3>
				<p className="text-sm mb-4">
					We&apos;re always looking to improve VetMed Tracker. Share your ideas
					with us!
				</p>
				<Button asChild>
					<Link href="mailto:feedback@vetmedtracker.com">Send Feedback</Link>
				</Button>
			</div>
		</div>
	);
}
