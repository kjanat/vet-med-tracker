"use client";

import Link from "next/link";
import { useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function FAQPage() {
	const [searchTerm, setSearchTerm] = useState("");

	const faqCategories = [
		{
			category: "Getting Started",
			questions: [
				{
					question: "How do I create my first medication schedule?",
					answer:
						"After signing up, go to your Dashboard and click 'Add Medication'. Enter your pet's medication details including name, dosage, frequency, and start date. The app will automatically create a schedule and send you reminders.",
				},
				{
					question: "Can I track medications for multiple pets?",
					answer:
						"Yes! VetMed Tracker supports unlimited pets. You can add pets from the 'Manage Animals' section and easily switch between them when recording medications.",
				},
				{
					question: "Is VetMed Tracker free to use?",
					answer:
						"Yes, VetMed Tracker is free for up to 2 pets. For households with more pets, we offer affordable premium plans with additional features like advanced reporting and priority support.",
				},
				{
					question: "Do I need to install anything?",
					answer:
						"No installation required! VetMed Tracker is a Progressive Web App (PWA) that works in your browser. You can optionally 'Add to Home Screen' on mobile devices for a native app experience.",
				},
			],
		},
		{
			category: "Recording Medications",
			questions: [
				{
					question: "What is the 3-tap recording feature?",
					answer:
						"Our signature feature makes recording medications quick and safe. Simply: 1) Select the medication, 2) Hold the confirmation button for 3 seconds (prevents accidental recordings), 3) Done! The app records the time and caregiver automatically.",
				},
				{
					question: "Can I record a medication given earlier?",
					answer:
						"Yes, you can backdate recordings. When recording a medication, tap the time field to change it to when the medication was actually given. This is helpful if you forgot to record it immediately.",
				},
				{
					question: "What happens if I miss a dose?",
					answer:
						"The app will mark doses as 'missed' after a configurable time window (default 4 hours). You'll see this in your history and compliance reports. You can still record late doses - the system tracks both scheduled and actual administration times.",
				},
				{
					question: "Can multiple people record medications?",
					answer:
						"Absolutely! Add caregivers to your household, and everyone can record medications. The app tracks who gave each dose, preventing double-dosing and ensuring clear communication.",
				},
			],
		},
		{
			category: "Reminders & Notifications",
			questions: [
				{
					question: "How do medication reminders work?",
					answer:
						"The app sends notifications 15 minutes before, at the scheduled time, and follows up at 15, 45, and 90 minutes after if not recorded. You can snooze reminders for 10 minutes up to 3 times.",
				},
				{
					question: "Can I customize reminder times?",
					answer:
						"Yes! In Settings, you can adjust reminder timing, choose which reminders to receive, and set quiet hours when you don't want to be disturbed.",
				},
				{
					question: "Why am I not receiving notifications?",
					answer:
						"Check that: 1) Notifications are enabled in your device settings, 2) You've granted notification permissions to the app, 3) You're not in 'quiet hours', 4) Your device isn't in Do Not Disturb mode.",
				},
				{
					question: "Can other caregivers get reminders too?",
					answer:
						"Yes, all caregivers in a household can opt-in to receive reminders. If the primary caregiver doesn't record a dose, reminders escalate to other caregivers after 45 minutes.",
				},
			],
		},
		{
			category: "Offline Functionality",
			questions: [
				{
					question: "How does offline mode work?",
					answer:
						"VetMed Tracker stores essential data locally on your device. You can view schedules, record medications, and access history without internet. Changes sync automatically when you reconnect.",
				},
				{
					question: "What features work offline?",
					answer:
						"Offline features include: viewing medication schedules, recording doses, checking history, viewing pet information, and basic inventory tracking. Adding new medications or caregivers requires internet.",
				},
				{
					question: "Will I lose data if I'm offline?",
					answer:
						"No! All offline actions are queued and synced when you reconnect. The app uses conflict resolution to handle any overlapping changes from multiple devices.",
				},
				{
					question: "How do I know if I'm offline?",
					answer:
						"An offline indicator appears at the top of the screen. The app also shows the number of pending syncs and when it last connected to the server.",
				},
			],
		},
		{
			category: "Privacy & Security",
			questions: [
				{
					question: "Is my pet's health data secure?",
					answer:
						"Yes, we take security seriously. All data is encrypted in transit and at rest. We use secure authentication, regular backups, and follow industry best practices. See our Privacy Policy for details.",
				},
				{
					question: "Who can see my pet's medication data?",
					answer:
						"Only members of your household can view your data. You control who joins your household. Veterinarians can be given read-only access if you choose. We never share your data with third parties.",
				},
				{
					question: "Can I export or delete my data?",
					answer:
						"Yes! You can export all your data in common formats (CSV, PDF) from Settings. You can also delete your account and all associated data at any time - this action is permanent.",
				},
				{
					question: "Do you sell my data?",
					answer:
						"Never. We do not sell, rent, or share your personal or pet health data with any third parties. Your privacy is fundamental to our service.",
				},
			],
		},
		{
			category: "Troubleshooting",
			questions: [
				{
					question: "The app isn't syncing - what should I do?",
					answer:
						"First, check your internet connection. Try pulling down to refresh. If issues persist: 1) Log out and back in, 2) Clear your browser cache, 3) Check if you have pending updates in Settings. Contact support if problems continue.",
				},
				{
					question: "I can't log in to my account",
					answer:
						"Ensure you're using the correct email address. Try the 'Forgot Password' option. If using social login (Google, etc.), make sure you're signed into the correct account. Clear cookies if switching between accounts.",
				},
				{
					question: "Inventory counts seem wrong",
					answer:
						"Inventory updates when you record doses. Check: 1) The correct inventory item is selected for each regimen, 2) Quantity per dose is set correctly, 3) Manual adjustments in Inventory Management. You can recalculate from the inventory page.",
				},
				{
					question: "How do I report a bug?",
					answer:
						"Report bugs via the Help menu or email support@vetmedtracker.com. Include: device type, browser, what you were doing, what went wrong, and screenshots if possible. We typically respond within 24 hours.",
				},
			],
		},
	];

	// Filter FAQs based on search term
	const filteredCategories = faqCategories
		.map((category) => ({
			...category,
			questions: category.questions.filter(
				(q) =>
					q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
					q.answer.toLowerCase().includes(searchTerm.toLowerCase()),
			),
		}))
		.filter((category) => category.questions.length > 0);

	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-bold text-4xl">Frequently Asked Questions</h1>
				<p className="text-muted-foreground text-xl">
					Find answers to common questions about VetMed Tracker
				</p>
			</div>

			{/* Search */}
			<div className="mx-auto mb-8 max-w-2xl">
				<input
					type="search"
					placeholder="Search FAQs..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full rounded-lg border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			{/* FAQ Accordion */}
			{filteredCategories.length > 0 ? (
				<div className="space-y-8">
					{filteredCategories.map((category) => (
						<div key={category.category}>
							<h2 className="mb-4 font-semibold text-2xl">
								{category.category}
							</h2>
							<Accordion type="single" collapsible className="space-y-4">
								{category.questions.map((faq, index) => (
									<AccordionItem
										key={`${category.category}-${index}`}
										value={`${category.category}-${index}`}
										className="rounded-lg border px-4"
									>
										<AccordionTrigger className="text-left hover:no-underline">
											<span className="pr-4">{faq.question}</span>
										</AccordionTrigger>
										<AccordionContent className="pt-2 pb-4 text-muted-foreground">
											{faq.answer}
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</div>
					))}
				</div>
			) : (
				<div className="py-12 text-center">
					<p className="mb-4 text-muted-foreground">
						No questions found matching &quot;{searchTerm}&quot;
					</p>
					<Button variant="outline" onClick={() => setSearchTerm("")}>
						Clear Search
					</Button>
				</div>
			)}

			{/* Still have questions? */}
			<div className="mt-16 rounded-lg bg-muted/50 p-8 text-center">
				<h2 className="mb-4 font-semibold text-2xl">Still Have Questions?</h2>
				<p className="mb-6 text-muted-foreground">
					Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
				</p>
				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<Button asChild>
						<Link href="/help">Visit Help Center</Link>
					</Button>
					<Button variant="outline" asChild>
						<Link href="mailto:support@vetmedtracker.com">Email Support</Link>
					</Button>
				</div>
			</div>

			{/* Quick Links */}
			<div className="mt-12 border-t pt-8">
				<div className="flex flex-wrap justify-center gap-4 text-sm">
					<Link href="/help" className="text-primary hover:underline">
						Help Center
					</Link>
					<span className="text-muted-foreground">•</span>
					<Link href="/privacy" className="text-primary hover:underline">
						Privacy Policy
					</Link>
					<span className="text-muted-foreground">•</span>
					<Link href="/terms" className="text-primary hover:underline">
						Terms of Service
					</Link>
					<span className="text-muted-foreground">•</span>
					<Link href="/cookies" className="text-primary hover:underline">
						Cookie Policy
					</Link>
				</div>
			</div>
		</div>
	);
}
