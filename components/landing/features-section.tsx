"use client";

import { Activity, Bell, Package, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section } from "./primitives/section";
import { SectionHeader } from "./primitives/section-header";

const features = [
  {
    bgColor: "bg-green-500/10",
    color: "text-green-600",
    description:
      "Record medications in seconds with our patented 3-tap system. Select, confirm, done.",
    icon: Activity,
    title: "3-Tap Recording",
  },
  {
    bgColor: "bg-blue-500/10",
    color: "text-blue-600",
    description:
      "Track medications for all your pets in one place. Perfect for multi-pet households.",
    icon: Users,
    title: "Multi-Pet Management",
  },
  {
    bgColor: "bg-purple-500/10",
    color: "text-purple-600",
    description:
      "Never miss a dose with intelligent reminders that escalate to ensure compliance.",
    icon: Bell,
    title: "Smart Reminders",
  },
  {
    bgColor: "bg-orange-500/10",
    color: "text-orange-600",
    description:
      "Know when to refill with automatic inventory tracking and low-stock alerts.",
    icon: Package,
    title: "Inventory Tracking",
  },
];

export function FeaturesSection() {
  return (
    <Section id="features" variant="gradient">
      <SectionHeader
        description="Built by pet parents, for pet parents. Every feature designed to make medication management effortless."
        title="Everything You Need for Peace of Mind"
      />

      {/* Features grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {features.map((feature) => (
          <Card
            className="p-6 transition-shadow hover:shadow-lg"
            key={`feature-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}
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
