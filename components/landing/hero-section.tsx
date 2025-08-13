"use client";

import { Shield } from "lucide-react";
import { AnimalSilhouettes } from "./animal-silhouettes";
import { CtaButtons } from "./content/cta-buttons";
import { FeatureHighlights } from "./content/feature-highlights";

export function HeroSection() {
  return (
    <section className="relative flex min-h-svh scroll-mt-20 flex-col justify-center">
      {/* Hero content container */}
      <div className="container relative z-10 mx-auto max-w-6xl px-4 py-20 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/30 hover:shadow-xl">
          <Shield className="h-4 w-4 animate-pulse" />
          <span className="font-medium text-sm">
            Trusted by 10,000+ Pet Parents
          </span>
        </div>

        {/* Main heading */}
        <h1 className="mb-6 font-bold text-4xl tracking-tight md:text-6xl lg:text-7xl">
          Never Miss a{" "}
          <span className="relative text-primary">
            Dose
            <svg
              className="-bottom-2 absolute left-0 w-full"
              viewBox="0 0 200 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M1 10C50 5 150 5 199 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>{" "}
          Again
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-8 max-w-3xl text-muted-foreground text-xl md:text-2xl">
          Professional medication tracking for your beloved pets. Simple,
          reliable, and designed with your peace of mind at heart.
        </p>

        {/* CTA buttons */}
        <CtaButtons variant="hero" className="mb-12" />

        {/* Feature highlights */}
        <FeatureHighlights className="mb-8" />

        {/* Decorative pet silhouettes */}
        <AnimalSilhouettes />
      </div>
    </section>
  );
}
