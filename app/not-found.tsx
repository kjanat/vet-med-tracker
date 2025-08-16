"use client";

import { ArrowLeft, Home, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-6 p-8 text-center">
        {/* Logo/Brand */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Search className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="font-bold text-6xl text-primary">404</h1>
          <h2 className="font-semibold text-2xl">Page Not Found</h2>
          <p className="text-muted-foreground">
            Oops! The page you're looking for seems to have wandered off. It
            might have been moved, deleted, or maybe it never existed.
          </p>
        </div>

        {/* Veterinary-themed message */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-muted-foreground text-sm italic">
            "Like a lost pet, this page has gone missing. But don't worry, we'll
            help you find your way back home!"
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Additional Help */}
        <div className="border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Need help? Check out our{" "}
            <Link href="/help" className="text-primary hover:underline">
              Help Center
            </Link>{" "}
            or{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              return to the dashboard
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
