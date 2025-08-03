"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<style jsx>{`
				.legal-content {
					font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', 'Arial', sans-serif;
					font-size: 14px;
					line-height: 1.5;
					color: hsl(var(--foreground) / 0.9);
					letter-spacing: -0.01em;
				}
				.legal-content h2 {
					font-size: 1.25rem;
					font-weight: 600;
					margin-top: 1.25rem;
					margin-bottom: 0.5rem;
					letter-spacing: -0.02em;
				}
				.legal-content h3 {
					font-size: 1.1rem;
					font-weight: 600;
					margin-top: 1rem;
					margin-bottom: 0.375rem;
				}
				.legal-content p {
					margin-bottom: 0.625rem;
				}
				.legal-content ul {
					margin-bottom: 0.625rem;
					margin-left: 1.5rem;
					list-style-type: disc;
				}
				.legal-content li {
					margin-bottom: 0.25rem;
					line-height: 1.5;
				}
				.legal-content strong {
					font-weight: 600;
					color: hsl(var(--foreground));
				}
				.legal-disclaimer {
					border: 1px solid hsl(var(--border));
					padding: 0.875rem;
					margin: 0.875rem 0;
					font-size: 13px;
					background: hsl(var(--muted) / 0.3);
					border-radius: 0.375rem;
				}
			`}</style>

			<h1 className="mb-6 font-bold text-3xl">Terms of Service</h1>

			<div className="legal-content prose dark:prose-invert max-w-none">
				<p className="mb-6 text-muted-foreground">
					Last updated: {new Date().toLocaleDateString()}
				</p>

				<section className="mb-6">
					<h2>1. Acceptance of Terms</h2>
					<p className="mb-4">
						By accessing and using VetMed Tracker (&quot;the Service&quot;), you
						accept and agree to be bound by the terms and provision of this
						agreement. If you do not agree to these terms, please do not use our
						Service.
					</p>
				</section>

				<section className="mb-6">
					<h2>2. Description of Service</h2>
					<p className="mb-4">
						VetMed Tracker is a Progressive Web Application (PWA) designed to
						help pet owners and caregivers track medication schedules for
						animals. The Service includes:
					</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>Medication schedule creation and management</li>
						<li>Administration recording and tracking</li>
						<li>Reminder notifications</li>
						<li>Multi-household and multi-caregiver support</li>
						<li>Offline functionality</li>
						<li>Inventory management</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>3. Medical Disclaimer</h2>
					<div className="legal-disclaimer">
						<p className="mb-2 font-semibold">Important Notice:</p>
						<p>
							VetMed Tracker is NOT a substitute for professional veterinary
							advice, diagnosis, or treatment. Always consult with a qualified
							veterinarian regarding any questions about your pet&apos;s health
							or medications.
						</p>
					</div>
					<p className="mb-4">
						The Service is designed solely to help track medication
						administrations as prescribed by your veterinarian. We do not
						provide medical advice, dosing calculations, or treatment
						recommendations.
					</p>
				</section>

				<section className="mb-6">
					<h2>4. User Accounts</h2>
					<p className="mb-4">
						To use certain features of the Service, you must:
					</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>Create an account using accurate and complete information</li>
						<li>Maintain the security of your account credentials</li>
						<li>Promptly notify us of any unauthorized use of your account</li>
						<li>
							Be responsible for all activities that occur under your account
						</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>5. User Responsibilities</h2>
					<p className="mb-4">You agree to:</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>Use the Service only for lawful purposes</li>
						<li>Enter accurate medication and administration information</li>
						<li>Verify all medication details with your veterinarian</li>
						<li>
							Not rely solely on the Service for critical medical decisions
						</li>
						<li>Maintain appropriate backups of your important data</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>6. Privacy and Data Protection</h2>
					<p className="mb-4">
						Your use of our Service is also governed by our{" "}
						<Link href="/privacy" className="text-primary hover:underline">
							Privacy Policy
						</Link>
						. We are committed to protecting your personal information and your
						pet&apos;s health data.
					</p>
				</section>

				<section className="mb-6">
					<h2>7. Intellectual Property</h2>
					<p className="mb-4">
						The Service and its original content, features, and functionality
						are owned by VetMed Tracker and are protected by international
						copyright, trademark, patent, trade secret, and other intellectual
						property laws.
					</p>
				</section>

				<section className="mb-6">
					<h2>8. Limitation of Liability</h2>
					<p className="mb-4">
						To the maximum extent permitted by law, VetMed Tracker shall not be
						liable for any indirect, incidental, special, consequential, or
						punitive damages, including without limitation, loss of profits,
						data, use, goodwill, or other intangible losses.
					</p>
					<p className="mb-4">
						In no event shall our liability exceed the amount paid by you, if
						any, for accessing or using the Service during the twelve (12)
						months immediately preceding the event giving rise to such
						liability.
					</p>
				</section>

				<section className="mb-6">
					<h2>9. Indemnification</h2>
					<p className="mb-4">
						You agree to defend, indemnify, and hold harmless VetMed Tracker and
						its officers, directors, employees, and agents from any claims,
						liabilities, damages, losses, and expenses arising from your use of
						the Service or violation of these Terms.
					</p>
				</section>

				<section className="mb-6">
					<h2>10. Termination</h2>
					<p className="mb-4">
						We may terminate or suspend your account and access to the Service
						immediately, without prior notice or liability, for any reason,
						including breach of these Terms.
					</p>
					<p className="mb-4">
						Upon termination, your right to use the Service will immediately
						cease. You may delete your account at any time through the account
						settings.
					</p>
				</section>

				<section className="mb-6">
					<h2>11. Changes to Terms</h2>
					<p className="mb-4">
						We reserve the right to modify these Terms at any time. If we make
						material changes, we will notify you by email or through the
						Service. Your continued use of the Service after changes constitutes
						acceptance of the modified Terms.
					</p>
				</section>

				<section className="mb-6">
					<h2>12. Governing Law</h2>
					<p className="mb-4">
						These Terms shall be governed by and construed in accordance with
						the laws of the jurisdiction in which VetMed Tracker operates,
						without regard to its conflict of law provisions.
					</p>
				</section>

				<section className="mb-6">
					<h2>13. Contact Information</h2>
					<p className="mb-4">
						If you have any questions about these Terms, please contact us at:
					</p>
					<ul className="list-none space-y-2">
						<li>
							Email:{" "}
							<a
								href="mailto:legal@vetmedtracker.com"
								className="text-primary hover:underline"
							>
								legal@vetmedtracker.com
							</a>
						</li>
						<li>Address: [Your Company Address]</li>
					</ul>
				</section>

				<div className="mt-12 border-t pt-8">
					<div className="flex items-center justify-between">
						<Link href="/privacy" className="text-primary hover:underline">
							Privacy Policy
						</Link>
						<Separator
							orientation="vertical"
							className="mx-4 hidden h-4 sm:block"
						/>
						<span className="text-muted-foreground sm:hidden">|</span>
						<Link href="/cookies" className="text-primary hover:underline">
							Cookie Policy
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
