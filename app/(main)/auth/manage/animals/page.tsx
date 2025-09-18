"use client";

import { FileText, Plus, Search } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
  AnimalFormDialog,
  useAnimalFormDialog,
} from "@/components/forms/animal-form-dialog";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Welcome component for empty state
function WelcomeState() {
  const { openAnimalForm } = useAnimalFormDialog();

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-4 font-bold text-4xl">Welcome!</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Add your first animal to start tracking their medications and health.
        </p>
        <Button className="gap-2" onClick={() => openAnimalForm()} size="lg">
          <Plus className="h-5 w-5" />
          Add Your First Animal
        </Button>
      </div>
    </div>
  );
}

// No household selected state
function NoHouseholdState() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 font-bold text-3xl">Animals</h1>
        <p className="text-muted-foreground">
          Please select a household to view animals
        </p>
      </div>
    </div>
  );
}

// Animal list component
function AnimalList({
  animals,
  timezone,
}: {
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    timezone?: string;
  }>;
  timezone: string;
}) {
  const { openAnimalForm } = useAnimalFormDialog();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter animals based on search query
  const filteredAnimals = animals.filter((animal) =>
    animal.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleEdit = (animal: (typeof animals)[0]) => {
    // Convert minimal animal to full Animal type - in a real app, we'd fetch full animal data here
    const fullAnimal = {
      ...animal,
      timezone: animal.timezone || timezone, // Use animal's timezone or fallback to household timezone
      allergies: [],
      conditions: [],
    };
    openAnimalForm(fullAnimal);
  };

  const handleEmergencyCard = (animalId: string) => {
    window.open(`/auth/manage/animals/${animalId}/emergency`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Add button */}
      {/* <div className="flex items-center justify-between">
				<p className="text-muted-foreground">
					Manage animal profiles and medical information
				</p>
				<Button onClick={() => openForm()} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Animal
				</Button>
			</div> */}

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search animals..."
          value={searchQuery}
        />
      </div>

      {/* Animals grid or no results message */}
      {filteredAnimals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAnimals.map((animal) => (
            <Card className="transition-shadow hover:shadow-md" key={animal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AnimalAvatar animal={animal} showBadge size="lg" />
                    <div>
                      <CardTitle className="text-lg">{animal.name}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {animal.species}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col space-y-3">
                {/* Status info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {animal.pendingMeds > 0 ? (
                      <span className="text-orange-600">
                        {animal.pendingMeds} pending
                      </span>
                    ) : (
                      <span className="text-green-600">Up to date</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleEdit(animal)}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                  <Button
                    className="gap-1"
                    onClick={() => handleEmergencyCard(animal.id)}
                    size="sm"
                    variant="outline"
                  >
                    <FileText className="h-3 w-3" />
                    Emergency Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <h3 className="mb-2 font-medium text-lg">No animals found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or{" "}
            <button
              className="text-primary hover:underline"
              onClick={() => setSearchQuery("")}
              type="button"
            >
              clear the search
            </button>
            .
          </p>
        </div>
      )}
    </div>
  );
}

// Main page component
export default function AnimalsPage() {
  const { animals, selectedHousehold, selectedAnimal } = useApp();

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  // Determine which content to render
  let content: React.ReactNode;
  if (!selectedHousehold) {
    content = <NoHouseholdState />;
  } else if (animals.length === 0) {
    content = <WelcomeState />;
  } else {
    content = <AnimalList animals={animals} timezone={timezone} />;
  }

  return (
    <>
      {content}
      <AnimalFormDialog />
    </>
  );
}
