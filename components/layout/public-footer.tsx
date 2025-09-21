"use client";

import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

type NavItem = {
  href: Route;
  label: string;
};

const footerSections: {
  company: NavItem[];
  legal: NavItem[];
  product: NavItem[];
  support: NavItem[];
} = {
  company: [
    { href: "/help", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/help", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#demo", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/help", label: "Help" },
  ],
  support: [
    { href: "/help", label: "Help Center" },
    { href: "/faq", label: "FAQ" },
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
              {footerSections.product.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Company</h3>
            <ul className="space-y-2">
              {footerSections.company.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Legal</h3>
            <ul className="space-y-2">
              {footerSections.legal.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Support</h3>
            <ul className="space-y-2">
              {footerSections.support.map((item) => (
                <li key={item.label}>
                  <Link
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                    href={item.href}
                  >
                    {item.label}
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
            <div className="flex gap-6">
              {/* <a
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://twitter.com/vetmedtracker"
                rel="noopener noreferrer"
                target="_blank"
              >
                Twitter
              </a> */}
              <a
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://github.com/kjanat/vet-med-tracker"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
              {/* <a
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                href="https://linkedin.com/company/vetmedtracker"
                rel="noopener noreferrer"
                target="_blank"
              >
                LinkedIn
              </a> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
