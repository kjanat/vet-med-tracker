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
		<div className="container mx-auto max-w-6xl px-4 py-12">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-bold text-4xl">How Can We Help?</h1>
				<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
					Find answers, get support, and learn how to make the most of VetMed
					Tracker
				</p>
			</div>

			{/* Search Section */}
			<div className="mx-auto mb-12 max-w-2xl">
				<div className="relative">
					<input
						type="search"
						placeholder="Search for help..."
						className="w-full rounded-lg border bg-background px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<button
						type="button"
						className="-translate-y-1/2 absolute top-1/2 right-3"
						aria-label="Search"
					>
						<svg
							className="h-5 w-5 text-muted-foreground"
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
			<div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
				{helpCategories.map((category) => {
					const Icon = category.icon;
					return (
						<Card key={category.title}>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
										<Icon className="h-5 w-5 text-primary" />
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
												className="text-primary transition-colors hover:text-primary/80 hover:underline"
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
				<h2 className="mb-6 text-center font-semibold text-2xl">
					Quick Answers
				</h2>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div className="p-6 text-center">
						<Clock className="mx-auto mb-4 h-12 w-12 text-primary" />
						<h3 className="mb-2 font-semibold">3-Tap Recording</h3>
						<p className="text-muted-foreground text-sm">
							Select medication, hold button for 3 seconds, done! It&apos;s that
							simple.
						</p>
					</div>
					<div className="p-6 text-center">
						<Smartphone className="mx-auto mb-4 h-12 w-12 text-primary" />
						<h3 className="mb-2 font-semibold">Works Offline</h3>
						<p className="text-muted-foreground text-sm">
							Record medications without internet. Data syncs automatically when
							reconnected.
						</p>
					</div>
					<div className="p-6 text-center">
						<Users className="mx-auto mb-4 h-12 w-12 text-primary" />
						<h3 className="mb-2 font-semibold">Multiple Caregivers</h3>
						<p className="text-muted-foreground text-sm">
							Share care responsibilities with family members or pet sitters.
						</p>
					</div>
				</div>
			</section>

			{/* Contact Support */}
			<section>
				<h2 className="mb-6 text-center font-semibold text-2xl">
					Still Need Help?
				</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					{contactMethods.map((method) => {
						const Icon = method.icon;
						return (
							<Card
								key={method.title}
								className="text-center transition-shadow hover:shadow-lg"
							>
								<CardContent className="pt-6">
									<Icon className="mx-auto mb-4 h-12 w-12 text-primary" />
									<h3 className="mb-2 font-semibold">{method.title}</h3>
									<p className="mb-4 text-muted-foreground text-sm">
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
			<div className="mt-12 rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
				<h3 className="mb-2 font-semibold">Emergency Veterinary Help</h3>
				<p className="mb-4 text-sm">
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
			<div className="mt-12 rounded-lg bg-primary/5 p-6 text-center">
				<Lightbulb className="mx-auto mb-4 h-12 w-12 text-primary" />
				<h3 className="mb-2 font-semibold">Have a Suggestion?</h3>
				<p className="mb-4 text-sm">
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
