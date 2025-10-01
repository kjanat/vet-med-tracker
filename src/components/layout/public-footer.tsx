import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

type NavLink = { href: Route; name: string };

const footerLinks = {
  legal: [
    { href: "/privacy", name: "Privacy Policy" },
    { href: "/terms", name: "Terms of Service" },
    { href: "/cookies", name: "Cookie Policy" },
  ],
  product: [
    { href: "/#features", name: "Features" },
    { href: "/#demo", name: "How It Works" },
  ],
  support: [
    { href: "/help", name: "Help Center" },
    { href: "/faq", name: "FAQ" },
  ],
} as const satisfies Record<string, readonly NavLink[]>;

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Main footer content */}
        <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
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
