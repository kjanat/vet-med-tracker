"use client";

import { CheckCircle } from "lucide-react";
import { CtaButtons } from "./content/cta-buttons";
import { Section } from "./primitives/section";

const benefits = [
  "Free forever for up to 2 pets",
  "No credit card required",
  "Works offline",
  "Cancel anytime",
];

export function CtaSection() {
  return (
    <Section className="py-20">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center shadow-2xl shadow-primary/10 transition-all duration-500 hover:shadow-primary/20 md:p-12">
          <div className="relative z-10">
            {/* Heading */}
            <h2 className="mb-4 font-bold text-3xl md:text-4xl">
              Start Caring Smarter Today
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground text-xl">
              Join thousands of pet parents who never worry about missed
              medications again.
            </p>

            {/* Benefits */}
            <div className="mb-8 flex flex-wrap justify-center gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={`benefit-${benefit.substring(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  className="flex items-center gap-2 transition-transform duration-200 hover:scale-105"
                >
                  <CheckCircle
                    className="h-5 w-5 animate-pulse text-green-600"
                    style={{
                      animationDelay: `${index * 200}ms`,
                      animationDuration: "2s",
                    }}
                  />
                  <span className="font-medium text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <CtaButtons variant="primary" />

            {/* Trust text */}
            <p className="mt-8 text-muted-foreground text-sm">
              Trusted by veterinarians and pet parents worldwide
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
