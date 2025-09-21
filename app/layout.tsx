import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { stackServerApp } from "@/stack/server";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SkipNavigation } from "@/components/ui/screen-reader-announcer";
import { TRPCProvider } from "@/server/trpc/client";
import { inter, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://vetmed.kjanat.com"),
  title: {
    template: "%s | VetMed",
    default: "VetMed Tracker",
  },
  description:
    "Track pet medications, set reminders, and manage veterinary prescriptions with ease.",
  keywords: [
    "pet medication tracker",
    "veterinary medicine management",
    "pet health app",
    "medication reminders",
    "animal prescription tracker",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VetMed Tracker",
    description: "Pet Medication Management",
    url: "https://vetmed.kjanat.com",
    siteName: "VetMed Tracker",
    images: [
      {
        url: "/icon0.svg",
        alt: "VetMed Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VetMed Tracker - Pet Medication Management",
    description:
      "Track pet medications and never miss a dose. Simple, reliable medication management for your furry friends.",
  },
  appleWebApp: {
    title: "VetMed",
  },
  icons: {
    icon: "/icon0.svg",
    shortcut: "/icon0.svg",
    apple: "/apple-icon.png",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  // noinspection HtmlRequiredTitleElement
  return (
    <html
      className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth`}
      lang="en"
      suppressHydrationWarning
    >
      <head />
      <body className={inter.className}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              disableTransitionOnChange
              enableSystem
            >
              <SkipNavigation
                links={[
                  { href: "#main-content", label: "Skip to main content" },
                ]}
              />
              <TRPCProvider>
                <main id="main-content">{children}</main>
              </TRPCProvider>
              <Analytics />
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
