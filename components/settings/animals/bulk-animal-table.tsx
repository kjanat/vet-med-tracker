"use client";

import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import {
  type BulkSelectionColumn,
  BulkSelectionTable,
} from "@/components/ui/bulk-selection-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/shared/use-toast";
import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { AnimalForm } from "./animal-form";

export function BulkAnimalTable() {
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
    avatar: undefined,
    breed: animal.breed || undefined,
    color: animal.color || undefined,
    conditions: animal.conditions || [],
    dob: animal.dob ? new Date(animal.dob) : undefined,
    id: animal.id,
    microchipId: animal.microchipId || undefined,
    name: animal.name,
    neutered: animal.neutered || false,
    pendingMeds: 0,
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

  // Define table columns
  const columns: BulkSelectionColumn<Animal>[] = [
    {
      key: "name",
      render: (animal) => (
        <div className="flex items-center gap-3">
          <AnimalAvatar animal={animal} showBadge size="sm" />
          <div>
            <div className="font-medium">{animal.name}</div>
            <div className="text-muted-foreground text-sm">
              {animal.breed
                ? `${animal.breed} ${animal.species}`
                : animal.species}
            </div>
          </div>
        </div>
      ),
      title: "Animal",
    },
    {
      key: "sex",
      render: (animal) => (
        <div className="text-sm">
          {animal.sex && (
            <div>
              {animal.sex}
              {animal.neutered && (
                <Badge className="ml-1 text-xs" variant="secondary">
                  Neutered
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
      title: "Sex/Status",
    },
    {
      key: "dob",
      render: (animal) =>
        animal.dob ? (
          <div className="text-sm">
            {Math.floor(
              (Date.now() - animal.dob.getTime()) /
                (365.25 * 24 * 60 * 60 * 1000),
            )}{" "}
            years
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
      title: "Age",
    },
    {
      key: "weightKg",
      render: (animal) =>
        animal.weightKg ? (
          <div className="text-sm">{animal.weightKg}kg</div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
      title: "Weight",
    },
    {
      key: "conditions",
      render: (animal) => (
        <div className="flex flex-wrap gap-1">
          {animal.conditions.length > 0 ? (
            animal.conditions.slice(0, 2).map((condition) => (
              <Badge className="text-xs" key={condition} variant="secondary">
                {condition}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">None</span>
          )}
          {animal.conditions.length > 2 && (
            <Badge className="text-xs" variant="outline">
              Number(){animal.conditions.length - 2}
            </Badge>
          )}
        </div>
      ),
      title: "Conditions",
    },
    {
      key: "allergies",
      render: (animal) => (
        <div className="flex flex-wrap gap-1">
          {animal.allergies.length > 0 ? (
            animal.allergies.slice(0, 2).map((allergy) => (
              <Badge className="text-xs" key={allergy} variant="destructive">
                {allergy}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">None</span>
          )}
          {animal.allergies.length > 2 && (
            <Badge className="text-xs" variant="outline">
              Number(){animal.allergies.length - 2}
            </Badge>
          )}
        </div>
      ),
      title: "Allergies",
    },
    {
      key: "actions",
      render: (animal) => (
        <div className="flex gap-1">
          <Button
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
          </Button>
        </div>
      ),
      title: "Actions",
    },
  ];

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
    vetPhone: data.vetPhone ?? undefined,
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

  const handleBulkDelete = async (selectedIds: string[]) => {
    const selectedAnimals = animals.filter((animal) =>
      selectedIds.includes(animal.id),
    );

    const confirmMessage = `Are you sure you want to delete ${selectedAnimals.length} animal${
      selectedAnimals.length > 1 ? "s" : ""
    }? This action cannot be undone.

Selected animals:
${selectedAnimals.map((animal) => `• ${animal.name}`).join("\n")}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete animals one by one (could be optimized with a bulk API)
      await Promise.all(
        selectedIds.map((id) => deleteAnimal.mutateAsync({ id })),
      );

      toast({
        description: `Deleted ${selectedIds.length} animal${
          selectedIds.length > 1 ? "s" : ""
        }`,
        title: "Success",
      });
    } catch (error) {
      console.error("Error deleting animals:", error);
      toast({
        description: "Failed to delete some animals",
        title: "Error",
        variant: "destructive",
      });
    }
  };

  const handleBulkExport = (selectedIds: string[]) => {
    const selectedAnimals = animals.filter((animal) =>
      selectedIds.includes(animal.id),
    );

    // Create CSV content
    const csvContent = [
      // Header
      "Name,Species,Breed,Sex,Neutered,Weight (kg),Microchip ID,Color,Timezone,Vet Name,Vet Phone,Allergies,Conditions",
      // Data rows
      ...selectedAnimals.map((animal) =>
        [
          animal.name,
          animal.species,
          animal.breed || "",
          animal.sex || "",
          animal.neutered ? "Yes" : "No",
          animal.weightKg || "",
          animal.microchipId || "",
          animal.color || "",
          animal.timezone,
          animal.vetName || "",
          animal.vetPhone || "",
          animal.allergies.join("; "),
          animal.conditions.join("; "),
        ].join(","),
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `animals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      description: `Exported ${selectedIds.length} animal${
        selectedIds.length > 1 ? "s" : ""
      } to CSV`,
      title: "Success",
    });
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
            Manage animal profiles and medical information with bulk selection
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

      {/* Bulk Selection Table */}
      <BulkSelectionTable
        columns={columns}
        data={filteredAnimals}
        emptyMessage={
          searchQuery
            ? "No animals found matching your search"
            : "No animals yet. Add your first animal to get started."
        }
        getItemId={(animal) => animal.id}
        getItemLabel={(animal) => animal.name}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
      />

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
