import { redirect } from "next/navigation";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { stackServerApp } from "@/stack/server";

export const experimental_ppr = true;

/**
 * Homepage - serves landing page directly or redirects authenticated users
 *
 * For authenticated users: redirects to dashboard
 * For unauthenticated users: renders landing page content
 */

export default async function HomePage() {
  const user = await stackServerApp.getUser();

  if (user) {
    // Authenticated user - redirect to main app
    redirect("/auth/dashboard");
  }

  // Unauthenticated user - show landing page at root
  return <LandingPageContent />;
}
