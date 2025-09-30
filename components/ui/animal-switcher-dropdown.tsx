"use client";

import { usePathname } from "next/navigation";
import { AnimalAvatar } from "@/components";
import { Badge } from "@/components/app/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "../providers/app-provider-consolidated";

// Pages where animal context is relevant
const ANIMAL_CONTEXT_PATHS = [
  "/",
  "/admin/record",
  "/history",
  "/regimens",
  "/insights",
];

export function AnimalSwitcherDropdown() {
  const { selectedAnimal, setSelectedAnimal, animals } = useApp();
  const pathname = usePathname();

  // Check if we should show the animal switcher
  const shouldShowSwitcher = ANIMAL_CONTEXT_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  // Don't render if not on a relevant page
  if (!shouldShowSwitcher) {
    return null;
  }

  const totalPendingMeds = animals.reduce(
    (sum, animal) => sum + (animal.pendingMeds || 0),
    0,
  );

  const handleAnimalChange = (value: string) => {
    if (value === "all") {
      setSelectedAnimal(null);
    } else {
      const animal = animals.find((a) => a.id === value);
      if (animal) {
        setSelectedAnimal(animal);
      }
    }
  };

  return (
    <div className="w-full max-w-[260px]">
      <Select
        onValueChange={handleAnimalChange}
        value={selectedAnimal?.id || "all"}
      >
        <SelectTrigger className="h-9 w-full px-3">
          <SelectValue>
            {selectedAnimal ? (
              <div className="flex items-center gap-2">
                <AnimalAvatar animal={selectedAnimal} size="xs" />
                <span className="truncate">{selectedAnimal.name}</span>
                {selectedAnimal.pendingMeds > 0 && (
                  <Badge
                    className="ml-auto h-5 px-1.5 text-xs"
                    variant="destructive"
                  >
                    {selectedAnimal.pendingMeds}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <span>All Animals</span>
                {totalPendingMeds > 0 && (
                  <Badge className="h-5 px-1.5 text-xs" variant="secondary">
                    {totalPendingMeds}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex w-full items-center justify-between pr-2">
              <span>All Animals</span>
              {totalPendingMeds > 0 && (
                <Badge className="ml-4 h-5 px-1.5 text-xs" variant="secondary">
                  {totalPendingMeds}
                </Badge>
              )}
            </div>
          </SelectItem>
          {animals.map((animal) => (
            <SelectItem key={animal.id} value={animal.id}>
              <div className="flex w-full items-center gap-2 pr-2">
                <AnimalAvatar animal={animal} size="xs" />
                <span className="flex-1 truncate">{animal.name}</span>
                {animal.pendingMeds > 0 && (
                  <Badge
                    className="ml-2 h-5 px-1.5 text-xs"
                    variant="destructive"
                  >
                    {animal.pendingMeds}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
