import Link from "next/link";

export default function TermsPage() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<h1 className="mb-6 font-bold text-3xl">Terms of Service</h1>

			<div className="prose prose-sm dark:prose-invert max-w-none [&_code]:rounded [&_code]:bg-muted/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_h3]:text-lg [&_li]:mb-1 [&_p]:mb-2.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mb-2.5 [&_ul]:ml-6 [&_ul]:list-disc">
				<p className="mb-6 text-muted-foreground">
					Last updated: December 15, 2024
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
					<div className="my-3.5 rounded-md border border-border bg-muted/30 p-3.5 text-[13px]">
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
						provide medical advice, treatment recommendations, or dosage
						calculations. Any dosage calculator features are informational tools
						only and should never replace professional veterinary guidance.
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
						the laws of the State of California, United States, without regard
						to its conflict of law provisions.
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
					</ul>
				</section>
			</div>
		</div>
	);
}
