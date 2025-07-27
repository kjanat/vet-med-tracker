"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Animal {
  id: string
  name: string
  species: string
  avatar?: string
  pendingMeds: number
}

interface AnimalAvatarProps {
  animal: Animal
  size?: "sm" | "md" | "lg"
  showBadge?: boolean
}

export function AnimalAvatar({ animal, size = "md", showBadge = false }: AnimalAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size])}>
        <AvatarImage src={animal.avatar || "/placeholder.svg"} alt={animal.name} />
        <AvatarFallback>
          {animal.name[0]}
          {animal.species[0]}
        </AvatarFallback>
      </Avatar>

      {showBadge && animal.pendingMeds > 0 && (
        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
          {animal.pendingMeds}
        </Badge>
      )}
    </div>
  )
}
