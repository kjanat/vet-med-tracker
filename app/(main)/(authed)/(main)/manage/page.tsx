"use client";

import { Dog, Home, Users } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const manageCards = [
  {
    title: "Animals",
    description: "Add, edit, and manage your animals' profiles",
    href: "/manage/animals" as const,
    icon: Dog,
  },
  {
    title: "Households",
    description: "Manage your households and their settings",
    href: "/manage/households" as const,
    icon: Home,
  },
  {
    title: "Users",
    description: "Manage household members and their roles",
    href: "/manage/users" as const,
    icon: Users,
  },
] as const;

export default function ManagePage() {
  const { selectedHousehold } = useApp();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage your households, animals, and team members
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {manageCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <card.icon className="h-5 w-5" />
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {!selectedHousehold && (
        <p className="text-center text-muted-foreground text-sm">
          Select a household to manage household-specific resources
        </p>
      )}
    </div>
  );
}
