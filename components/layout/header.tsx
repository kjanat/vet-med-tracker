"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HouseholdSwitcher } from "../ui/household-switcher"
import { AnimalSwitcher } from "../ui/animal-switcher"

export function Header() {
  // Add inventory alerts to the notification count
  const inventoryAlerts = 2 // This would come from a hook or context

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <HouseholdSwitcher />
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">{3 + inventoryAlerts}</Badge>
          </Button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <AnimalSwitcher />
      </div>
    </header>
  )
}
