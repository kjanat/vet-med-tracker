/**
 * Example demonstrating how to use the form factory pattern
 * This file demonstrates the pattern before refactoring existing forms
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createFormHook, type FormValidationResult } from "./useFormFactory";

// Example schema
const exampleSchema = z.object({
  age: z.number().min(0).max(150),
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name is required"),
});

type ExampleFormData = z.infer<typeof exampleSchema>;
type ExampleContext = { id?: string } | null | undefined;
type ExampleApiPayload = ExampleFormData & { householdId: string };

// Example transformer
const ExampleDataTransformer = {
  setDefaultValues: () => ({
    age: 0,
    email: "",
    name: "",
  }),
  toApiPayload: (
    formData: ExampleFormData,
    context: unknown,
  ): ExampleApiPayload => {
    const household = (context as ExampleContext) ?? null;

    return {
      ...formData,
      householdId: household?.id ?? "",
    };
  },
};

// Example validator
const ExampleFormValidator = {
  getDisplayMessage: (result: FormValidationResult) =>
    result.isValid ? null : (result.errors[0]?.message ?? "Validation failed"),
  validate: (data: ExampleFormData): FormValidationResult => {
    const errors: FormValidationResult["errors"] = [];

    if (!data.name.length) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (!data.email.includes("@")) {
      errors.push({ field: "email", message: "Email must be valid" });
    }

    return {
      errors,
      isValid: errors.length === 0,
      warnings: [],
    };
  },
};

// Example form state hook (simplified)
const useExampleFormState = () => ({
  clearError: () => {},
  closeForm: () => {},
  error: null,
  isDirty: false,
  isLoading: false,
  isOpen: false,
  openForm: () => {},
  resetForm: () => {},
  saveForm: async () => {},
  setDirty: () => {},
  setError: () => {},
});

// Example mutation
const useExampleMutation = () => ({
  isPending: false,
  mutateAsync: async (data: ExampleApiPayload) => {
    console.log("Saving:", data);
    return { success: true };
  },
});

// Create the form hook using the factory
export const useExampleForm = createFormHook({
  dataTransformer: ExampleDataTransformer,
  formState: { useFormState: useExampleFormState },
  mutation: { useMutation: useExampleMutation },
  resolver: zodResolver(exampleSchema),
  resourceName: "example",
  validator: ExampleFormValidator,
});

/**
 * Usage example:
 *
 * function ExampleComponent() {
 *   const {
 *     isOpen,
 *     form,
 *     openForm,
 *     closeForm,
 *     saveForm,
 *     isLoading,
 *   } = useExampleForm({
 *     onSave: async (data) => {
 *       console.log("Custom save logic:", data);
 *     }
 *   });
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(saveForm)}>
 *       // Form fields here
 *     </form>
 *   );
 * }
 */
