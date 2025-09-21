import type { Route } from "next";
import Link from "next/link";
import type React from "react";
import { Logo } from "@/components/ui/logo";

type NavItem = {
  href: Route;
  label: string;
};

const navLinks: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/help", label: "Help" },
];

const legalLinks: NavItem[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];

const CURRENT_YEAR = new Date().getFullYear();

export function StaticPublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/95">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link className="flex items-center gap-2" href="/">
            <Logo size="sm" />
            <span className="font-semibold text-lg">VetMed Tracker</span>
          </Link>
          <nav className="hidden items-center gap-5 font-medium text-muted-foreground text-sm md:flex">
            {navLinks.map((link) => (
              <Link
                className="transition-colors hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            className="hidden rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm md:inline-flex"
            href="/auth/cosign"
          >
            Sign In
          </Link>
        </div>
      </header>
      <main
        className="relative flex-1 bg-gradient-to-b from-background via-background to-muted/40"
        id="main-content"
      >
        <div aria-hidden className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10">{children}</div>
      </main>
      <footer className="border-t bg-muted/40">
        <div className="container mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-muted-foreground text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span>© {CURRENT_YEAR} VetMed Tracker</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                className="transition-colors hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
