import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const footerLinks = {
  company: [
    { href: "/about" as Route, name: "About" },
    { href: "/blog" as Route, name: "Blog" },
    { href: "/contact" as Route, name: "Contact" },
    { href: "/careers" as Route, name: "Careers" },
  ],
  legal: [
    { href: "/privacy" as Route, name: "Privacy Policy" },
    { href: "/terms" as Route, name: "Terms of Service" },
    { href: "/cookies" as Route, name: "Cookie Policy" },
  ],
  product: [
    { href: "/#features" as Route, name: "Features" },
    { href: "/#demo" as Route, name: "How It Works" },
    { href: "/#pricing" as Route, name: "Pricing" },
    { href: "/security" as Route, name: "Security" },
  ],
  support: [
    { href: "/help" as Route, name: "Help Center" },
    { href: "/faq" as Route, name: "FAQ" },
    { href: "/status" as Route, name: "Status" },
    { href: "/docs" as Route, name: "API Docs" },
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
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
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
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
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
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
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
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={link.href}
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
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://twitter.com/vetmedtracker"
              >
                Twitter
              </Link>
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://github.com/vetmedtracker"
              >
                GitHub
              </Link>
              <Link
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://linkedin.com/company/vetmedtracker"
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
