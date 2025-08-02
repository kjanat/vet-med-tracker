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
			<div className="container max-w-4xl mx-auto px-4">
				<div className="bg-primary/5 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
					{/* Background decoration */}
					<div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
					<div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

					<div className="relative z-10">
						{/* Heading */}
						<h2 className="text-3xl md:text-4xl font-bold mb-4">
							Start Caring Smarter Today
						</h2>
						<p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
							Join thousands of pet parents who never worry about missed
							medications again.
						</p>

						{/* Benefits */}
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							{benefits.map((benefit, _index) => (
								<div
									key={`benefit-${benefit.substring(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
									className="flex items-center gap-2"
								>
									<CheckCircle className="w-5 h-5 text-green-600" />
									<span className="text-sm font-medium">{benefit}</span>
								</div>
							))}
						</div>

						{/* CTA buttons */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							{isLoaded && !user && (
								<Button
									size="lg"
									className="text-lg px-8"
									onClick={() => openSignIn()}
								>
									Get Started Free
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
							<Button
								size="lg"
								variant="outline"
								className="text-lg px-8"
								asChild
							>
								<Link href="/contact">Questions? Contact Us</Link>
							</Button>
						</div>

						{/* Trust text */}
						<p className="text-sm text-muted-foreground mt-8">
							Trusted by veterinarians and pet parents worldwide
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
