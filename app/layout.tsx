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
import { TRPCProvider } from "@/server/trpc/client";
import { siteConfig } from "./config";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.shortName}`,
    default: siteConfig.name,
  },
  description: siteConfig.description,
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
    title: siteConfig.name,
    description: "Pet Medication Management",
    url: siteConfig.url,
    siteName: siteConfig.name,
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
    title: `${siteConfig.name} - Pet Medication Management`,
    description:
      "Track pet medications and never miss a dose. Simple, reliable medication management for your furry friends.",
  },
  appleWebApp: {
    title: siteConfig.shortName,
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
