"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
	ArrowRight,
	CheckCircle,
	Pill,
	Shield,
	Smartphone,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
	const { openSignIn } = useClerk();
	const { user, isLoaded } = useUser();

	return (
		<section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
			</div>

			{/* Hero content */}
			<div className="relative z-10 container max-w-6xl mx-auto px-4 py-16 text-center">
				{/* Badge */}
				<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
					<Shield className="w-4 h-4" />
					<span className="text-sm font-medium">
						Trusted by 10,000+ Pet Parents
					</span>
				</div>

				{/* Main heading */}
				<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
					Never Miss a{" "}
					<span className="text-primary relative">
						Dose
						<svg
							className="absolute -bottom-2 left-0 w-full"
							viewBox="0 0 200 20"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								d="M1 10C50 5 150 5 199 10"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
							/>
						</svg>
					</span>{" "}
					Again
				</h1>

				{/* Subtitle */}
				<p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
					Professional medication tracking for your beloved pets. Simple,
					reliable, and designed with your peace of mind at heart.
				</p>

				{/* CTA buttons */}
				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
					{isLoaded && !user && (
						<Button
							size="lg"
							className="text-lg px-8"
							onClick={() => openSignIn()}
						>
							Start Free
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					)}
					{isLoaded && user && (
						<Button size="lg" className="text-lg px-8" asChild>
							<Link href="/dashboard">
								Go to Dashboard
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>
					)}
					<Button size="lg" variant="outline" className="text-lg px-8" asChild>
						<Link href="#demo">See How It Works</Link>
					</Button>
				</div>

				{/* Feature highlights */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
					<div className="flex items-center gap-3 justify-center">
						<div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
							<CheckCircle className="w-5 h-5 text-green-600" />
						</div>
						<span className="text-sm font-medium">3-Tap Recording</span>
					</div>
					<div className="flex items-center gap-3 justify-center">
						<div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
							<Smartphone className="w-5 h-5 text-blue-600" />
						</div>
						<span className="text-sm font-medium">Works Offline</span>
					</div>
					<div className="flex items-center gap-3 justify-center">
						<div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
							<Pill className="w-5 h-5 text-purple-600" />
						</div>
						<span className="text-sm font-medium">Smart Reminders</span>
					</div>
				</div>

				{/* Pet silhouettes animation */}
				<div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden opacity-10">
					<div className="flex gap-8 animate-scroll">
						{[
							"dog",
							"cat",
							"rabbit",
							"dog",
							"cat",
							"rabbit",
							"dog",
							"cat",
							"rabbit",
							"dog",
						].map((type, i) => (
							<PetSilhouette
								key={`pet-silhouette-${type}-${Math.floor(i / 3)}`}
								type={type as "dog" | "cat" | "rabbit"}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function PetSilhouette({ type }: { type: "dog" | "cat" | "rabbit" }) {
	const paths = {
		dog: "M10 20c0-4 2-6 2-10s-2-6-2-6-2 2-2 6 2 6 2 10z",
		cat: "M12 2c-2 0-3 1-3 3s1 3 3 3 3-1 3-3-1-3-3-3z",
		rabbit: "M12 8c-1 0-2 1-2 2s1 2 2 2 2-1 2-2-1-2-2-2z",
	};

	return (
		<svg
			width="60"
			height="60"
			viewBox="0 0 24 24"
			fill="currentColor"
			className="flex-shrink-0"
			aria-label={`${type} silhouette`}
		>
			<title>{`${type} silhouette`}</title>
			<path d={paths[type]} />
		</svg>
	);
}
