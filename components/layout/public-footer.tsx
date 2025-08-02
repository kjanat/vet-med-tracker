import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const footerLinks = {
	product: [
		{ name: "Features", href: "#features" },
		{ name: "How It Works", href: "#demo" },
		{ name: "Pricing", href: "#pricing" },
		{ name: "Security", href: "/security" },
	],
	company: [
		{ name: "About", href: "/about" },
		{ name: "Blog", href: "/blog" },
		{ name: "Contact", href: "/contact" },
		{ name: "Careers", href: "/careers" },
	],
	legal: [
		{ name: "Privacy Policy", href: "/privacy" },
		{ name: "Terms of Service", href: "/terms" },
		{ name: "Cookie Policy", href: "/cookies" },
	],
	support: [
		{ name: "Help Center", href: "/help" },
		{ name: "FAQ", href: "/faq" },
		{ name: "Status", href: "/status" },
		{ name: "API Docs", href: "/docs" },
	],
};

export function PublicFooter() {
	return (
		<footer className="bg-muted/50 border-t">
			<div className="container max-w-6xl mx-auto px-4 py-12">
				{/* Main footer content */}
				<div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
					{/* Brand column */}
					<div className="col-span-2 md:col-span-1">
						<div className="flex items-center gap-2 mb-4">
							<Logo size="sm" />
							<span className="font-semibold">VetMed Tracker</span>
						</div>
						<p className="text-sm text-muted-foreground">
							Professional medication tracking for your beloved pets.
						</p>
					</div>

					{/* Links columns */}
					<div>
						<h3 className="font-semibold mb-3">Product</h3>
						<ul className="space-y-2">
							{footerLinks.product.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="font-semibold mb-3">Company</h3>
						<ul className="space-y-2">
							{footerLinks.company.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="font-semibold mb-3">Legal</h3>
						<ul className="space-y-2">
							{footerLinks.legal.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>

					<div>
						<h3 className="font-semibold mb-3">Support</h3>
						<ul className="space-y-2">
							{footerLinks.support.map((link) => (
								<li key={link.name}>
									<Link
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										{link.name}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="pt-8 border-t">
					<div className="flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-sm text-muted-foreground">
							© {new Date().getFullYear()} VetMed Tracker. All rights reserved.
						</p>
						<div className="flex gap-6">
							<Link
								href="https://twitter.com/vetmedtracker"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Twitter
							</Link>
							<Link
								href="https://github.com/vetmedtracker"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								GitHub
							</Link>
							<Link
								href="https://linkedin.com/company/vetmedtracker"
								className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
