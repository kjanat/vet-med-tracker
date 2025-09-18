"use client";

import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";

interface Animal {
  id: string;
  name: string;
  species: string;
  avatar?: string;
  pendingMeds?: number;
}

interface AnimalAvatarProps {
  animal: Animal;
  size?: "xs" | "sm" | "md" | "lg";
  showBadge?: boolean;
  className?: string;
}

export const AnimalAvatar = memo(function AnimalAvatar({
  animal,
  size = "md",
  showBadge = false,
  className,
}: AnimalAvatarProps) {
  const sizeClasses = {
    lg: "h-12 w-12",
    md: "h-8 w-8",
    sm: "h-6 w-6",
    xs: "h-5 w-5",
  };

  const textSizeClasses = {
    lg: "text-base",
    md: "text-sm",
    sm: "text-xs",
    xs: "text-[10px]",
  };

  const avatarColor = getAvatarColor(animal.name);

  return (
    <div className={cn("relative", className)}>
      <Avatar className={cn(sizeClasses[size])}>
        {animal.avatar && <AvatarImage alt={animal.name} src={animal.avatar} />}
        <AvatarFallback
          className={cn(
            avatarColor,
            "font-medium text-white",
            textSizeClasses[size],
          )}
        >
          {animal.name[0]}
          {animal.species[0]}
        </AvatarFallback>
      </Avatar>

      {showBadge && (animal.pendingMeds ?? 0) > 0 && (
        <Badge
          className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
          variant="destructive"
        >
          {animal.pendingMeds ?? 0}
        </Badge>
      )}
    </div>
  );
});
