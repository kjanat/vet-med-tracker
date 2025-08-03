"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function CookiesPage() {
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
				.legal-content code {
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
					font-size: 13px;
					background: hsl(var(--muted) / 0.3);
					padding: 0.125rem 0.25rem;
					border-radius: 0.25rem;
				}
			`}</style>

			<h1 className="mb-6 font-bold text-3xl">Cookie Policy</h1>

			<div className="legal-content prose dark:prose-invert max-w-none">
				<p className="mb-6 text-muted-foreground">
					Last updated: {new Date().toLocaleDateString()}
				</p>

				<section className="mb-6">
					<h2>What Are Cookies</h2>
					<p className="mb-4">
						Cookies are small text files that are placed on your device when you
						visit our website. They help us provide you with a better experience
						by remembering your preferences and understanding how you use our
						service.
					</p>
				</section>

				<section className="mb-6">
					<h2>How We Use Cookies</h2>
					<p className="mb-4">
						VetMed Tracker uses cookies for the following purposes:
					</p>
					<ul className="mb-4 list-disc space-y-2 pl-6">
						<li>
							<strong>Authentication:</strong> To keep you signed in securely
							across sessions
						</li>
						<li>
							<strong>Preferences:</strong> To remember your selected household
							and animal
						</li>
						<li>
							<strong>Analytics:</strong> To understand how you use our app and
							improve our services
						</li>
						<li>
							<strong>Performance:</strong> To ensure our app loads quickly and
							works offline
						</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>Types of Cookies We Use</h2>

					<div className="space-y-6">
						<div>
							<h3>Essential Cookies</h3>
							<p className="mb-2">
								These cookies are necessary for the website to function
								properly.
							</p>
							<ul className="list-disc space-y-1 pl-6">
								<li>
									<code>__clerk_*</code> - Authentication and security
								</li>
								<li>
									<code>selectedHouseholdId</code> - Your current household
									selection
								</li>
								<li>
									<code>theme</code> - Your preferred color theme
								</li>
							</ul>
						</div>

						<div>
							<h3>Performance Cookies</h3>
							<p className="mb-2">
								These help us understand how visitors interact with our website.
							</p>
							<ul className="list-disc space-y-1 pl-6">
								<li>Service Worker cache data for offline functionality</li>
								<li>IndexedDB for offline data storage</li>
							</ul>
						</div>
					</div>
				</section>

				<section className="mb-6">
					<h2>Managing Cookies</h2>
					<p className="mb-4">
						You can control and manage cookies in various ways. Please note that
						removing or blocking cookies may impact your user experience and
						parts of our website may no longer be fully accessible.
					</p>
					<p className="mb-4">
						Most browsers automatically accept cookies, but you can modify your
						browser settings to decline cookies if you prefer. Here are links to
						cookie management instructions for popular browsers:
					</p>
					<ul className="list-disc space-y-2 pl-6">
						<li>
							<a
								href="https://support.google.com/chrome/answer/95647"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								Chrome
							</a>
						</li>
						<li>
							<a
								href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								Firefox
							</a>
						</li>
						<li>
							<a
								href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								Safari
							</a>
						</li>
						<li>
							<a
								href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								Edge
							</a>
						</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2>Updates to This Policy</h2>
					<p className="mb-4">
						We may update this Cookie Policy from time to time. When we do, we
						will notify you by updating the &quot;Last updated&quot; date at the
						top of this policy.
					</p>
				</section>

				<section className="mb-6">
					<h2>Contact Us</h2>
					<p className="mb-4">
						If you have any questions about our use of cookies, please contact
						us at{" "}
						<a
							href="mailto:privacy@vetmedtracker.com"
							className="text-primary hover:underline"
						>
							privacy@vetmedtracker.com
						</a>
					</p>
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
						<Link href="/terms" className="text-primary hover:underline">
							Terms of Service
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
