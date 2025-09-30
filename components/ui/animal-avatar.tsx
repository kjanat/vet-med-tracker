import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/general";

interface Animal {
  id: string;
  name: string;
  species?: string;
  photoUrl?: string | null;
  pendingMeds?: number;
}

interface AnimalAvatarProps {
  // Support both individual props and animal object
  name?: string;
  photoUrl?: string | null;
  species?: string;
  animal?: Animal;
  className?: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function AnimalAvatar({
  name,
  photoUrl,
  species = "unknown",
  animal,
  className,
  size = "md",
  showBadge = false,
}: AnimalAvatarProps) {
  // Use animal object if provided, otherwise use individual props
  const animalName = animal?.name || name || "Unknown";
  const animalPhoto = animal?.photoUrl || photoUrl;
  const _animalSpecies = animal?.species || species;
  const pendingMeds = animal?.pendingMeds || 0;
  const sizeClasses = {
    lg: "h-12 w-12",
    md: "h-10 w-10",
    sm: "h-8 w-8",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        {animalPhoto && (
          <AvatarImage alt={`${animalName} avatar`} src={animalPhoto} />
        )}
        <AvatarFallback>{getInitials(animalName)}</AvatarFallback>
      </Avatar>
      {showBadge && pendingMeds > 0 && (
        <div className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">
          {pendingMeds}
        </div>
      )}
    </div>
  );
}
