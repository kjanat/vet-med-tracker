"use client";

import { useStackApp, useUser } from "@stackframe/stack";
import { Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/app/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/app/sheet";
import { Logo } from "@/components/ui/logo";

const navigation = [
  { href: "#features", name: "Features" },
  { href: "#demo", name: "How It Works" },
  { href: "#testimonials", name: "Testimonials" },
  { href: "#pricing", name: "Pricing" },
];

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const app = useStackApp();
  const user = useUser();
  const isLoaded = true; // Stack Auth loads synchronously

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-6xl items-center px-4">
        {/* Logo */}
        <Link className="flex items-center gap-2" href="/">
          <Logo size="sm" />
          <span className="font-semibold text-lg">VetMed Tracker</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="mx-auto hidden items-center gap-6 md:flex"
          id="main-navigation"
        >
          {navigation.map((item) => (
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href={item.href as Route}
              key={item.name}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-4 md:flex">
          {!isLoaded ? (
            // Loading placeholder to prevent hydration mismatch
            <div className="h-10 w-20 animate-pulse rounded-md bg-muted" />
          ) : !user ? (
            <>
              <Button onClick={() => app.redirectToSignIn()} variant="ghost">
                Sign In
              </Button>
              <Button onClick={() => app.redirectToSignUp()}>
                Get Started
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/auth/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger asChild className="ml-auto md:hidden">
            <Button aria-label="Open menu" size="icon" variant="ghost">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-8 flex flex-col gap-4">
              {navigation.map((item) => (
                <Link
                  className="font-medium text-lg transition-colors hover:text-primary"
                  href={item.href as Route}
                  key={item.name}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="space-y-3 border-t pt-4">
                {!isLoaded ? (
                  // Loading placeholder
                  <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                ) : !user ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => {
                        app.redirectToSignIn();
                        setIsOpen(false);
                      }}
                      variant="outline"
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => {
                        app.redirectToSignUp();
                        setIsOpen(false);
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                ) : (
                  <Button asChild className="w-full">
                    <Link
                      href="/auth/dashboard"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
