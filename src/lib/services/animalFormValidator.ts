import type { AnimalFormData } from "@/lib/schemas/animal";

export class AnimalFormValidator {
  static canSubmit(
    data: AnimalFormData,
    context?: { household?: unknown; isEditing?: boolean },
  ): boolean {
    // Basic validation
    if (!data.name || !data.species || !data.timezone) {
      return false;
    }
    // Require household context for new animals
    return !(!context?.isEditing && !context?.household);
  }

  static getErrorMessage(
    data: AnimalFormData,
    context?: { household?: unknown; isEditing?: boolean },
  ): string | null {
    if (!data.name) return "Name is required";
    if (!data.species) return "Species is required";
    if (!data.timezone) return "Timezone is required";
    if (!context?.isEditing && !context?.household) {
      return "Household is required for new animals";
    }
    return null;
  }
}
