"use client";

import { Activity, Bell, Package, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section } from "./primitives/section";
import { SectionHeader } from "./primitives/section-header";

const features = [
  {
    title: "3-Tap Recording",
    description:
      "Record medications in seconds with our patented 3-tap system. Select, confirm, done.",
    icon: Activity,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Multi-Pet Management",
    description:
      "Track medications for all your pets in one place. Perfect for multi-pet households.",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Smart Reminders",
    description:
      "Never miss a dose with intelligent reminders that escalate to ensure compliance.",
    icon: Bell,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Inventory Tracking",
    description:
      "Know when to refill with automatic inventory tracking and low-stock alerts.",
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
];

export function FeaturesSection() {
  return (
    <Section id="features" variant="gradient">
      <SectionHeader
        title="Everything You Need for Peace of Mind"
        description="Built by pet parents, for pet parents. Every feature designed to make medication management effortless."
      />

      {/* Features grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {features.map((feature) => (
          <Card
            key={`feature-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}
            className="p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-lg ${feature.bgColor} flex flex-shrink-0 items-center justify-center`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-xl">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
