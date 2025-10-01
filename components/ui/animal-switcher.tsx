"use client";

import { AnimalAvatar } from "@/components";
import { Badge } from "@/components/app/badge";
import { useApp } from "@/components/providers";
import { cn } from "@/lib/utils/general";
import { ScrollArea, ScrollBar } from "./scroll-area";

export function AnimalSwitcher() {
  const { selectedAnimal, setSelectedAnimal, animals } = useApp();

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <button
          className={cn(
            "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 font-medium text-sm transition-colors",
            !selectedAnimal
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent",
          )}
          onClick={() => setSelectedAnimal(null)}
          type="button"
        >
          All Animals
          <Badge className="ml-1" variant="secondary">
            {animals.reduce((sum, animal) => sum + animal.pendingMeds, 0)}
          </Badge>
        </button>

        {animals.map((animal) => (
          <button
            className={cn(
              "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 font-medium text-sm transition-colors",
              selectedAnimal?.id === animal.id
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent",
            )}
            key={animal.id}
            onClick={() => setSelectedAnimal(animal)}
            type="button"
          >
            <AnimalAvatar animal={animal} size="sm" />
            {animal.name}
            {animal.pendingMeds > 0 && (
              <Badge className="ml-1" variant="destructive">
                {animal.pendingMeds}
              </Badge>
            )}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
