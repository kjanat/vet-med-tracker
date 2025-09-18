"use client";

import { usePathname } from "next/navigation";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/general";
import { useApp } from "../providers/app-provider-consolidated";

// Pages where animal context is relevant
const ANIMAL_CONTEXT_PATHS = [
  "/",
  "/admin/record",
  "/history",
  "/regimens",
  "/insights",
];

export function AnimalBreadcrumb() {
  const { selectedAnimal, setSelectedAnimal, animals } = useApp();
  const pathname = usePathname();

  // Check if we should show the animal switcher
  const shouldShowSwitcher = ANIMAL_CONTEXT_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  // Don't render if not on a relevant page or no animals
  if (!shouldShowSwitcher || animals.length === 0) {
    return null;
  }

  const totalPendingMeds = animals.reduce(
    (sum, animal) => sum + (animal.pendingMeds || 0),
    0,
  );

  const handleAnimalSelect = (animal: (typeof animals)[0] | null) => {
    setSelectedAnimal(animal);
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink className="font-normal" href="#">
            Animals
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <BreadcrumbPage
                aria-label={`Switch animal. Current: ${selectedAnimal ? selectedAnimal.name : "All animals"}`}
                className="cursor-pointer transition-colors hover:text-muted-foreground"
              >
                {selectedAnimal ? (
                  <span className="flex items-center gap-1.5">
                    <AnimalAvatar animal={selectedAnimal} size="xs" />
                    <span>{selectedAnimal.name}</span>
                    {selectedAnimal.pendingMeds > 0 && (
                      <Badge
                        className="ml-0.5 h-4 px-1 text-[10px]"
                        variant="destructive"
                      >
                        {selectedAnimal.pendingMeds}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>All</span>
                    {totalPendingMeds > 0 && (
                      <Badge
                        className="ml-0.5 h-4 px-1 text-[10px]"
                        variant="secondary"
                      >
                        {totalPendingMeds}
                      </Badge>
                    )}
                  </span>
                )}
              </BreadcrumbPage>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                className={cn("cursor-pointer", !selectedAnimal && "bg-accent")}
                onClick={() => handleAnimalSelect(null)}
              >
                <div className="flex w-full items-center justify-between">
                  <span>All Animals</span>
                  {totalPendingMeds > 0 && (
                    <Badge className="h-4 px-1 text-[10px]" variant="secondary">
                      {totalPendingMeds}
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
              {animals.map((animal) => (
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer",
                    selectedAnimal?.id === animal.id && "bg-accent",
                  )}
                  key={animal.id}
                  onClick={() => handleAnimalSelect(animal)}
                >
                  <div className="flex w-full items-center gap-2">
                    <AnimalAvatar animal={animal} size="xs" />
                    <span className="flex-1">{animal.name}</span>
                    {animal.pendingMeds > 0 && (
                      <Badge
                        className="h-4 px-1 text-[10px]"
                        variant="destructive"
                      >
                        {animal.pendingMeds}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
