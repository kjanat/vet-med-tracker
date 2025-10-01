"use cache";

import {
  BookOpen,
  Bug,
  Clock,
  FileQuestion,
  Lightbulb,
  Mail,
  MessageCircle,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { siteConfig } from "@/app/config";
import { Button } from "@/components/app/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HelpPage() {
  const helpCategories: Array<{
    icon: typeof BookOpen;
    title: string;
    description: string;
    links: Array<{ label: string; href: Route }>;
  }> = [
    {
      description: "Learn the basics of VetMed Tracker",
      icon: BookOpen,
      links: [
        { href: "#quick-start", label: "Quick Start Guide" },
        {
          href: "#first-schedule",
          label: "Creating Your First Medication Schedule",
        },
        { href: "#add-caregivers", label: "Adding Caregivers" },
      ],
      title: "Getting Started",
    },
    {
      description: "Tips and tricks for daily use",
      icon: Smartphone,
      links: [
        { href: "#recording", label: "Recording Medications" },
        { href: "#reminders", label: "Setting Up Reminders" },
      ],
      title: "Using the App",
    },
    {
      description: "Manage your account and data",
      icon: Shield,
      links: [
        { href: "#account", label: "Account Settings" },
        { href: "/privacy", label: "Data Privacy" },
        { href: "#households", label: "Household Management" },
      ],
      title: "Account & Security",
    },
    {
      description: "Solutions to common issues",
      icon: Bug,
      links: [
        { href: "#sync", label: "Sync Issues" },
        { href: "#notifications", label: "Notification Problems" },
        { href: "#login", label: "Login Issues" },
      ],
      title: "Troubleshooting",
    },
  ] as const;

  const contactMethods: Array<{
    icon: typeof Mail;
    title: string;
    description: string;
    action: string;
    href: Route | `mailto:${string}`;
  }> = [
    {
      action: siteConfig.contact.support,
      description: "Get help via email within 24 hours",
      href: `mailto:${siteConfig.contact.support}`,
      icon: Mail,
      title: "Email Support",
    },
    {
      action: "Start Chat",
      description: "Chat with our support team",
      href: "#chat",
      icon: MessageCircle,
      title: "Live Chat",
    },
    {
      action: "View FAQ",
      description: "Find answers to common questions",
      href: "/faq",
      icon: FileQuestion,
      title: "FAQ",
    },
    {
      action: "Visit Forum",
      description: "Connect with other pet parents",
      href: "#forum",
      icon: Users,
      title: "Community Forum",
    },
  ] as const;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-bold text-4xl">How Can We Help?</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
          Find answers, get support, and learn how to make the most of VetMed
          Tracker
        </p>
      </div>

      {/* Search Section */}
      <div className="mx-auto mb-12 max-w-2xl">
        <div className="relative">
          <input
            className="w-full rounded-lg border bg-background px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search for help..."
            type="search"
          />
          <button
            aria-label="Search"
            className="-translate-y-1/2 absolute top-1/2 right-3"
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Help Categories */}
      <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
        {helpCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        className="text-primary transition-colors hover:text-primary/80 hover:underline"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Answers */}
      <section className="mb-16">
        <h2 className="mb-6 text-center font-semibold text-2xl">
          Quick Answers
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="p-6 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 font-semibold">3-Tap Recording</h3>
            <p className="text-muted-foreground text-sm">
              Select medication, hold button for 3 seconds, done! It&apos;s that
              simple.
            </p>
          </div>
          <div className="p-6 text-center">
            <Smartphone className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 font-semibold">Works Offline</h3>
            <p className="text-muted-foreground text-sm">
              Record medications without internet. Data syncs automatically when
              reconnected.
            </p>
          </div>
          <div className="p-6 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 font-semibold">Multiple Caregivers</h3>
            <p className="text-muted-foreground text-sm">
              Share care responsibilities with family members or pet sitters.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section>
        <h2 className="mb-6 text-center font-semibold text-2xl">
          Still Need Help?
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                className="text-center transition-shadow hover:shadow-lg"
                key={method.title}
              >
                <CardContent className="pt-6">
                  <Icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-semibold">{method.title}</h3>
                  <p className="mb-4 text-muted-foreground text-sm">
                    {method.description}
                  </p>
                  <Button asChild className="w-full" variant="outline">
                    {method.href.startsWith("mailto:") ? (
                      <a href={method.href}>{method.action}</a>
                    ) : (
                      <Link href={method.href}>{method.action}</Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Emergency Support */}
      <div className="mt-12 rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
        <h3 className="mb-2 font-semibold">Emergency Veterinary Help</h3>
        <p className="mb-4 text-sm">
          For medical emergencies, contact your veterinarian immediately or
          visit the nearest emergency animal hospital.
        </p>
        <p className="text-sm">
          <strong>Pet Poison Helpline:</strong>{" "}
          <a className="text-primary hover:underline" href="tel:855-764-7661">
            (855) 764-7661
          </a>
        </p>
      </div>

      {/* Feedback Section */}
      <div className="mt-12 rounded-lg bg-primary/5 p-6 text-center">
        <Lightbulb className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 font-semibold">Have a Suggestion?</h3>
        <p className="mb-4 text-sm">
          We&apos;re always looking to improve VetMed Tracker. Share your ideas
          with us!
        </p>
        <Button asChild>
          <Link href={`mailto:${siteConfig.contact.feedback}`}>
            Send Feedback
          </Link>
        </Button>
      </div>
    </div>
  );
}
