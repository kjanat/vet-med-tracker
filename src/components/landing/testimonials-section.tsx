"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "./content/stats-grid.tsx";
import { Section } from "./primitives/section.tsx";
import { SectionHeader } from "./primitives/section-header.tsx";

const testimonials = [
  {
    avatar: "SM",
    content:
      "This app saved my sanity! With two dogs on different medications, I was constantly worried about mixing things up. Now everything is organized and I get reminders right when I need them.",
    name: "Sarah M.",
    rating: 5,
    role: "Dog Mom to Max & Luna",
  },
  {
    avatar: "JW",
    content:
      "I recommend VetMed Tracker to all my clients with pets on regular medications. The compliance rates have improved dramatically, and the emergency card feature has been a lifesaver.",
    name: "Dr. James Wilson",
    rating: 5,
    role: "Veterinarian",
  },
  {
    avatar: "EC",
    content:
      "Managing medications for multiple foster cats used to be a nightmare. This app makes it so easy to track who gets what and when. The household feature is perfect for our rescue group.",
    name: "Emily Chen",
    rating: 5,
    role: "Foster Parent",
  },
];

export function TestimonialsSection() {
  return (
    <Section variant="muted">
      <SectionHeader
        description="Join thousands of pet parents who've transformed how they manage their pets' health."
        title="Loved by Pet Parents Everywhere"
      />

      {/* Testimonials grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card
            className="transition-shadow hover:shadow-lg"
            key={`testimonial-${testimonial.name.replace(/\s+/g, "-").toLowerCase()}`}
          >
            <CardContent className="p-6">
              {/* Rating stars */}
              <div className="mb-4 flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    className="h-5 w-5 fill-primary text-primary"
                    key={`star-${testimonial.name}-${i}`}
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mb-6 text-muted-foreground">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <StatsGrid
        className="mt-16"
        stats={[
          { highlight: true, label: "Pet Parents", value: "10,000+" },
          { highlight: true, label: "Pets Tracked", value: "50,000+" },
          { highlight: true, label: "Doses Recorded", value: "1M+" },
          { highlight: true, label: "Uptime", value: "99.9%" },
        ]}
      />
    </Section>
  );
}
