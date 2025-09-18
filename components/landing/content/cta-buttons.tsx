"use client";

import { useStackApp, useUser } from "@stackframe/stack";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/general";

interface CtaButtonsProps {
  className?: string;
  variant?: "primary" | "hero";
  showSecondary?: boolean;
}

export function CtaButtons({
  className,
  variant = "primary",
  showSecondary = true,
}: CtaButtonsProps) {
  const app = useStackApp();
  const user = useUser();

  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-4 sm:flex-row",
        className,
      )}
    >
      {!user && (
        <Button
          className="px-8 text-lg"
          onClick={() => app.redirectToSignUp()}
          size="lg"
        >
          {variant === "hero" ? "Start Free" : "Get Started Free"}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )}
      {user && (
        <Button asChild className="px-8 text-lg" size="lg">
          <Link href="/auth/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      )}
      {showSecondary && (
        <Button asChild className="px-8 text-lg" size="lg" variant="outline">
          <Link href={variant === "hero" ? "#demo" : "/help"}>
            {variant === "hero" ? "See How It Works" : "Questions? Contact Us"}
          </Link>
        </Button>
      )}
    </div>
  );
}
