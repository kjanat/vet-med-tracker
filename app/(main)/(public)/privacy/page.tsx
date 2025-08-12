import Link from "next/link";

export default function PrivacyPage() {
	return (
		<div className="container mx-auto max-w-4xl px-4 py-12">
			<h1 className="mb-6 font-bold text-3xl">Privacy Policy</h1>

			<div className="prose prose-sm dark:prose-invert max-w-none [&_code]:rounded [&_code]:bg-muted/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_h3]:text-lg [&_li]:mb-1 [&_p]:mb-2.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mb-2.5 [&_ul]:ml-6 [&_ul]:list-disc">
				<p className="mb-6 text-muted-foreground">
					Last updated: December 15, 2024
				</p>

				<section className="mb-6">
					<h2>Introduction</h2>
					<p className="mb-4">
						VetMed Tracker (&quot;we,&quot; &quot;our,&quot; or &quot;the
						Service&quot;) is committed to protecting your privacy and the
						privacy of your pets&apos; health information. This Privacy Policy
						explains how we collect, use, disclose, and safeguard your
						information when you use our medication tracking application.
					</p>
				</section>

				<section className="mb-6">
					<h2>Information We Collect</h2>

					<div className="space-y-6">
						<div>
							<h3>Personal Information</h3>
							<p className="mb-2">When you create an account, we collect:</p>
							<ul className="list-disc space-y-2 pl-6">
								<li>Email address</li>
								<li>Name (optional)</li>
								<li>Profile picture (optional)</li>
								<li>Authentication data from OAuth providers</li>
							</ul>
						</div>

						<div>
							<h3>Pet Health Information</h3>
							<p className="mb-2">To provide our services, we collect:</p>
							<ul className="list-disc space-y-2 pl-6">
								<li>Pet names, species, and basic information</li>
								<li>Medication names, dosages, and schedules</li>
								<li>Administration records and timestamps</li>
								<li>Veterinary notes (if provided)</li>
								<li>Inventory tracking data</li>
							</ul>
						</div>

						<div>
							<h3>Usage Information</h3>
							<p className="mb-2">We automatically collect:</p>
							<ul className="list-disc space-y-2 pl-6">
								<li>Device information (type, operating system)</li>
								<li>Browser type and version</li>
								<li>IP address (anonymized)</li>
								<li>Usage patterns and feature interactions</li>
								<li>Error logs and performance data</li>
							</ul>
						</div>
					</div>
				</section>

				<section className="mb-6">
					<h2>How We Use Your Information</h2>
					<p className="mb-4">We use the collected information to:</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>Provide and maintain the medication tracking service</li>
						<li>Send medication reminders and notifications</li>
						<li>Enable multi-household and caregiver features</li>
						<li>Improve our service and develop new features</li>
						<li>Provide customer support</li>
						<li>Ensure platform security and prevent fraud</li>
						<li>Comply with legal obligations</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>Data Storage and Security</h2>
					<p className="mb-4">
						We implement industry-standard security measures to protect your
						data:
					</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>Encryption in transit (TLS/SSL) and at rest</li>
						<li>Secure authentication through trusted OAuth providers</li>
						<li>Regular security audits and updates</li>
						<li>Access controls and employee training</li>
						<li>Secure cloud infrastructure with regular backups</li>
					</ul>
					<p className="mb-4">
						Your data is stored on secure servers in [specify region]. We retain
						your data for as long as your account is active or as needed to
						provide services.
					</p>
				</section>

				<section className="mb-6">
					<h2>Data Sharing and Disclosure</h2>
					<p className="mb-4">
						We do not sell your personal information. We may share data:
					</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>
							<strong>With your consent:</strong> When you explicitly authorize
							sharing
						</li>
						<li>
							<strong>Within households:</strong> With other authorized
							caregivers in your household
						</li>
						<li>
							<strong>Service providers:</strong> With trusted partners who help
							operate our service
						</li>
						<li>
							<strong>Legal requirements:</strong> When required by law or to
							protect rights
						</li>
						<li>
							<strong>Business transfers:</strong> In case of merger,
							acquisition, or sale
						</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>Your Rights and Choices</h2>
					<p className="mb-4">You have the right to:</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>
							<strong>Access:</strong> Request a copy of your personal data
						</li>
						<li>
							<strong>Correction:</strong> Update or correct inaccurate
							information
						</li>
						<li>
							<strong>Deletion:</strong> Request deletion of your account and
							data
						</li>
						<li>
							<strong>Portability:</strong> Export your data in a
							machine-readable format
						</li>
						<li>
							<strong>Opt-out:</strong> Unsubscribe from marketing
							communications
						</li>
						<li>
							<strong>Restriction:</strong> Limit how we process your data
						</li>
					</ul>
					<p className="mb-4">
						To exercise these rights, contact us at{" "}
						<a
							href="mailto:privacy@vetmedtracker.com"
							className="text-primary hover:underline"
						>
							privacy@vetmedtracker.com
						</a>
					</p>
				</section>

				<section className="mb-6">
					<h2>Children&apos;s Privacy</h2>
					<p className="mb-4">
						VetMed Tracker is not intended for children under 13. We do not
						knowingly collect personal information from children. If you believe
						we have collected information from a child, please contact us
						immediately.
					</p>
				</section>

				<section className="mb-6">
					<h2>International Data Transfers</h2>
					<p className="mb-4">
						If you access our Service from outside [your country], your
						information may be transferred to and processed in [your country].
						By using our Service, you consent to these transfers.
					</p>
				</section>

				<section className="mb-6">
					<h2>Third-Party Services</h2>
					<p className="mb-4">Our Service integrates with:</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>
							<strong>Stack Auth:</strong> For authentication services
						</li>
						<li>
							<strong>Analytics providers:</strong> To understand usage patterns
						</li>
						<li>
							<strong>Cloud infrastructure:</strong> For data storage and
							processing
						</li>
					</ul>
					<p className="mb-4">
						These services have their own privacy policies, and we encourage you
						to review them.
					</p>
				</section>

				<section className="mb-6">
					<h2>Cookies and Tracking</h2>
					<p className="mb-4">
						We use cookies and similar technologies as described in our{" "}
						<Link href="/cookies" className="text-primary hover:underline">
							Cookie Policy
						</Link>
						. You can manage cookie preferences through your browser settings.
					</p>
				</section>

				<section className="mb-6">
					<h2>Changes to This Policy</h2>
					<p className="mb-4">
						We may update this Privacy Policy periodically. We will notify you
						of material changes by email or through the Service. Your continued
						use after changes constitutes acceptance of the updated policy.
					</p>
				</section>

				<section className="mb-6">
					<h2>Contact Us</h2>
					<p className="mb-4">
						If you have questions or concerns about this Privacy Policy or our
						data practices, please contact us:
					</p>
					<ul className="list-none space-y-2">
						<li>
							Email:{" "}
							<a
								href="mailto:privacy@vetmedtracker.com"
								className="text-primary hover:underline"
							>
								privacy@vetmedtracker.com
							</a>
						</li>
						<li>Address: [Your Company Address]</li>
						<li>Data Protection Officer: [Name/Contact if applicable]</li>
					</ul>
				</section>
			</div>
		</div>
	);
}
