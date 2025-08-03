"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const benefits = [
	"Free forever for up to 2 pets",
	"No credit card required",
	"Works offline",
	"Cancel anytime",
];

export function CtaSection() {
	const { openSignIn } = useClerk();
	const { user, isLoaded } = useUser();

	return (
		<section className="py-20">
			<div className="container mx-auto max-w-4xl px-4">
				<div className="relative overflow-hidden rounded-3xl bg-primary/5 p-8 text-center md:p-12">
					{/* Background decoration */}
					<div className="-top-20 -right-20 absolute h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
					<div className="-bottom-20 -left-20 absolute h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

					<div className="relative z-10">
						{/* Heading */}
						<h2 className="mb-4 font-bold text-3xl md:text-4xl">
							Start Caring Smarter Today
						</h2>
						<p className="mx-auto mb-8 max-w-2xl text-muted-foreground text-xl">
							Join thousands of pet parents who never worry about missed
							medications again.
						</p>

						{/* Benefits */}
						<div className="mb-8 flex flex-wrap justify-center gap-4">
							{benefits.map((benefit) => (
								<div
									key={`benefit-${benefit.substring(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
									className="flex items-center gap-2"
								>
									<CheckCircle className="h-5 w-5 text-green-600" />
									<span className="font-medium text-sm">{benefit}</span>
								</div>
							))}
						</div>

						{/* CTA buttons */}
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							{isLoaded && !user && (
								<Button
									size="lg"
									className="px-8 text-lg"
									onClick={() => openSignIn()}
								>
									Get Started Free
									<ArrowRight className="ml-2 h-5 w-5" />
								</Button>
							)}
							{isLoaded && user && (
								<Button size="lg" className="px-8 text-lg" asChild>
									<Link href="/dashboard">
										Go to Dashboard
										<ArrowRight className="ml-2 h-5 w-5" />
									</Link>
								</Button>
							)}
							<Button
								size="lg"
								variant="outline"
								className="px-8 text-lg"
								asChild
							>
								<Link href="/contact">Questions? Contact Us</Link>
							</Button>
						</div>

						{/* Trust text */}
						<p className="mt-8 text-muted-foreground text-sm">
							Trusted by veterinarians and pet parents worldwide
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
