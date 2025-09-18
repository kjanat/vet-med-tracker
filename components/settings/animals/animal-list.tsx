"use client";

import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/shared/use-toast";
import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { AnimalForm } from "./animal-form";

export function AnimalList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { selectedHouseholdId } = useApp();
  const { toast } = useToast();

  // Fetch animals from the database
  const {
    data: animalsData = [],
    isLoading,
    error,
  } = trpc.animal.list.useQuery(
    { householdId: selectedHouseholdId || "" },
    { enabled: Boolean(selectedHouseholdId) },
  );

  // Transform database animals to match Animal interface
  const animals: Animal[] = animalsData.map((animal) => ({
    allergies: animal.allergies || [],
    avatar: undefined, // TODO: Add avatar support when photoUrl is implemented
    breed: animal.breed || undefined,
    color: animal.color || undefined,
    conditions: animal.conditions || [],
    dob: animal.dob ? new Date(animal.dob) : undefined,
    id: animal.id,
    microchipId: animal.microchipId || undefined,
    name: animal.name,
    neutered: animal.neutered || false,
    pendingMeds: 0, // TODO: Calculate pending medications count
    sex: (animal.sex as "Male" | "Female") || undefined,
    species: animal.species,
    timezone: animal.timezone,
    vetName: animal.vetName || undefined,
    vetPhone: animal.vetPhone || undefined,
    weightKg: animal.weightKg ? Number(animal.weightKg) : undefined,
  }));

  // tRPC mutations
  const utils = trpc.useUtils();
  const createAnimal = trpc.animal.create.useMutation({
    onSuccess: () => {
      utils.animal.list.invalidate();
      utils.household.getAnimals.invalidate();
    },
  });

  const updateAnimal = trpc.animal.update.useMutation({
    onSuccess: () => {
      utils.animal.list.invalidate();
      utils.household.getAnimals.invalidate();
    },
  });

  const deleteAnimal = trpc.animal.delete.useMutation({
    onSuccess: () => {
      utils.animal.list.invalidate();
      utils.household.getAnimals.invalidate();
    },
  });

  const filteredAnimals = animals.filter((animal) =>
    animal.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingAnimal(null);
    setIsFormOpen(true);
  };

  const prepareAnimalData = (data: Partial<Animal>) => ({
    allergies: data.allergies || [],
    breed: data.breed,
    color: data.color,
    conditions: data.conditions || [],
    dob: data.dob?.toISOString(),
    microchipId: data.microchipId,
    name: data.name || "",
    neutered: data.neutered || false,
    sex: data.sex,
    species: data.species || "",
    timezone: data.timezone || "America/New_York",
    vetName: data.vetName,
    vetPhone: data.vetPhone,
    weightKg: data.weightKg,
  });

  const handleSave = async (data: Partial<Animal>) => {
    if (!selectedHouseholdId) {
      toast({
        description: "No household selected",
        title: "Error",
        variant: "destructive",
      });
      return;
    }

    try {
      const animalData = prepareAnimalData(data);

      if (editingAnimal) {
        await updateAnimal.mutateAsync({
          id: editingAnimal.id,
          ...animalData,
        });
      } else {
        await createAnimal.mutateAsync(animalData);
      }

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent(
          editingAnimal ? "settings_animals_update" : "settings_animals_create",
          {
            detail: { animalId: editingAnimal?.id, name: data.name },
          },
        ),
      );

      toast({
        description: `${editingAnimal ? "Updated" : "Created"} ${data.name}`,
        title: "Success",
      });

      setIsFormOpen(false);
      setEditingAnimal(null);
    } catch (error) {
      console.error("Error saving animal:", error);
      toast({
        description: `Failed to ${editingAnimal ? "update" : "create"} ${data.name}`,
        title: "Error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (animal: Animal) => {
    if (
      !confirm(
        `Are you sure you want to delete ${animal.name}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteAnimal.mutateAsync({ id: animal.id });
      toast({
        description: `Deleted ${animal.name}`,
        title: "Success",
      });
    } catch (error) {
      console.error("Error deleting animal:", error);
      toast({
        description: `Failed to delete ${animal.name}`,
        title: "Error",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyCard = (animalId: string) => {
    window.open(`/manage/animals/${animalId}/emergency`, "_blank");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl">Animals</h2>
            <p className="text-muted-foreground">
              Manage animal profiles and medical information
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Add Animal
          </Button>
        </div>
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">Loading animals...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl">Animals</h2>
            <p className="text-muted-foreground">
              Manage animal profiles and medical information
            </p>
          </div>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Add Animal
          </Button>
        </div>
        <div className="flex justify-center py-8">
          <p className="text-destructive">Failed to load animals</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!selectedHouseholdId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl">Animals</h2>
            <p className="text-muted-foreground">
              Manage animal profiles and medical information
            </p>
          </div>
        </div>
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">
            Please select a household first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl">Animals</h2>
          <p className="text-muted-foreground">
            Manage animal profiles and medical information
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={createAnimal.isPending}
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          Add Animal
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search animals..."
          value={searchQuery}
        />
      </div>

      {/* Animals Grid */}
      {filteredAnimals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-muted-foreground">
            {searchQuery
              ? "No animals found matching your search"
              : "No animals yet"}
          </p>
          {!searchQuery && (
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Your First Animal
            </Button>
          )}
        </div>
      ) : (
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
                        {animal.breed
                          ? `${animal.breed} ${animal.species}`
                          : animal.species}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {animal.sex && (
                    <div>
                      <span className="font-medium">Sex:</span> {animal.sex}
                      {animal.neutered && " (Neutered)"}
                    </div>
                  )}
                  {animal.weightKg && (
                    <div>
                      <span className="font-medium">Weight:</span>{" "}
                      {animal.weightKg}kg
                    </div>
                  )}
                  {animal.dob && (
                    <div>
                      <span className="font-medium">Age:</span>{" "}
                      {Math.floor(
                        (Date.now() - animal.dob.getTime()) /
                          (365.25 * 24 * 60 * 60 * 1000),
                      )}{" "}
                      years
                    </div>
                  )}
                </div>

                {animal.conditions.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-sm">Conditions:</p>
                    <div className="flex flex-wrap gap-1">
                      {animal.conditions.map((condition) => (
                        <Badge
                          className="text-xs"
                          key={condition}
                          variant="secondary"
                        >
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {animal.allergies.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-sm">Allergies:</p>
                    <div className="flex flex-wrap gap-1">
                      {animal.allergies.map((allergy) => (
                        <Badge
                          className="text-xs"
                          key={allergy}
                          variant="destructive"
                        >
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    disabled={updateAnimal.isPending}
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
                  <Button
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={deleteAnimal.isPending}
                    onClick={() => handleDelete(animal)}
                    size="sm"
                    variant="outline"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Animal Form */}
      <AnimalForm
        animal={editingAnimal}
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        open={isFormOpen}
      />
    </div>
  );
}
