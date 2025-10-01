import { StackProvider, StackTheme } from "@stackframe/stack";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { stackServerApp } from "@/stack/server";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SkipNavigation } from "@/components/ui/screen-reader-announcer";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProvider } from "@/lib/trpc/client";
import { siteConfig } from "./config.ts";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    title: siteConfig.shortName,
  },
  description: siteConfig.description,
  icons: {
    apple: "/apple-icon.png",
    icon: "/icon0.svg",
    shortcut: "/icon0.svg",
  },
  keywords: [
    "pet medication tracker",
    "veterinary medicine management",
    "pet health app",
    "medication reminders",
    "animal prescription tracker",
  ],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: "Pet Medication Management",
    images: [
      {
        alt: "VetMed Logo",
        url: "/icon0.svg",
      },
    ],
    locale: "en_US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.shortName}`,
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Track pet medications and never miss a dose. Simple, reliable medication management for your furry friends.",
    title: `${siteConfig.name} - Pet Medication Management`,
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  // noinspection HtmlRequiredTitleElement
  return (
    <html
      className={`${inter.className} scroll-smooth`}
      lang="en"
      suppressHydrationWarning
    >
      <head />
      <body>
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
              <Toaster />
              <Analytics />
            </ThemeProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
