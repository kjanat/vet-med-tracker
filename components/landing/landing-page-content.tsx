import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { AnimatedBackground } from "@/components/landing/primitives/animated-background";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

/**
 * Complete landing page content with layout
 * Used at the root route for unauthenticated users
 */
export function LandingPageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main-content" className="relative flex-1">
        {/* Unified animated background for all sections */}
        <AnimatedBackground variant="default" />
        <div className="relative z-10">
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <TestimonialsSection />
          <CtaSection />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
