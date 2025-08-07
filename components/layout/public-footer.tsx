import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const footerLinks = {
	product: [
		{ name: "Features", href: "/#features" as Route },
		{ name: "How It Works", href: "/#demo" as Route },
		{ name: "Pricing", href: "/#pricing" as Route },
		{ name: "Security", href: "/security" as Route },
	],
	company: [
		{ name: "About", href: "/about" as Route },
		{ name: "Blog", href: "/blog" as Route },
		{ name: "Contact", href: "/contact" as Route },
		{ name: "Careers", href: "/careers" as Route },
	],
	legal: [
		{ name: "Privacy Policy", href: "/privacy" as Route },
		{ name: "Terms of Service", href: "/terms" as Route },
		{ name: "Cookie Policy", href: "/cookies" as Route },
	],
	support: [
		{ name: "Help Center", href: "/help" as Route },
		{ name: "FAQ", href: "/faq" as Route },
		{ name: "Status", href: "/status" as Route },
		{ name: "API Docs", href: "/docs" as Route },
	],
};

export function PublicFooter() {
	return (
		<footer className="border-t bg-muted/50">
			<div className="container mx-auto max-w-6xl px-4 py-12">
				{/* Main footer content */}
				<div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-5">
					{/* Brand column */}
					<div className="col-span-2 md:col-span-1">
						<div className="mb-4 flex items-center gap-2">
							<Logo size="sm" />
							<span className="font-semibold">VetMed Tracker</span>
						</div>
						<p className="text-muted-foreground text-sm">
							Professional medication tracking for your beloved pets.
						</p>
					</div>

					{/* Links columns */}
					<div>
						<h3 className="mb-3 font-semibold">Product</h3>
						<ul className="space-y-2">
							{footerLinks.product.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="mb-3 font-semibold">Company</h3>
						<ul className="space-y-2">
							{footerLinks.company.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="mb-3 font-semibold">Legal</h3>
						<ul className="space-y-2">
							{footerLinks.legal.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="mb-3 font-semibold">Support</h3>
						<ul className="space-y-2">
							{footerLinks.support.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="border-t pt-8">
					<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
						<p className="text-muted-foreground text-sm">
							© {new Date().getFullYear()} VetMed Tracker. All rights reserved.
						</p>
						<div className="flex hidden gap-6">
							<Link
								href="https://twitter.com/vetmedtracker"
								className="text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								Twitter
							</Link>
							<Link
								href="https://github.com/vetmedtracker"
								className="text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								GitHub
							</Link>
							<Link
								href="https://linkedin.com/company/vetmedtracker"
								className="text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								LinkedIn
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
