"use client";

// Minimal stub for landing page content
export interface LandingPageContentProps {
  className?: string;
}

export function LandingPageContent({ className }: LandingPageContentProps) {
  return (
    <div className={className}>
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-4 font-bold text-4xl">VetMed Tracker</h1>
        <p className="mb-8 text-gray-600 text-xl">
          Simplify medication management for your pets
        </p>
        <div className="space-y-4">
          <a
            className="inline-block rounded-lg bg-blue-500 px-6 py-3 text-white hover:bg-blue-600"
            href="/auth/sign-in"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

export default LandingPageContent;
