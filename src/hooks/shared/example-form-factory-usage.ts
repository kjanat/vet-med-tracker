/**
 * Example demonstrating how to use the form factory pattern
 * This file demonstrates the pattern before refactoring existing forms
 *
 * Note: "Unused" warnings are expected - this is reference/example code
 * showing the required shape of objects, not production code.
 *
 * @example
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

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createFormHook, type FormValidationResult } from "./useFormFactory.ts";

// Example schema
const exampleSchema = z.object({
  age: z.number().min(0).max(150),
  email: z.email("Valid email required"),
  name: z.string().min(1, "Name is required"),
});

type ExampleFormData = z.infer<typeof exampleSchema>;

// Example transformer
const ExampleDataTransformer = {
  setDefaultValues: (options?: Partial<ExampleFormData>) => ({
    age: 0,
    email: "",
    name: "",
    ...options,
  }),
  toApiPayload: (formData: ExampleFormData, _context: unknown) => formData,
};

// Example validator
const ExampleFormValidator = {
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
  setError: (_error: string | null) => {},
});

// Example mutation
const useExampleMutation = () => ({
  isPending: false,
  mutateAsync: async (_data: ExampleFormData) => ({}),
});

// Create the form hook using the factory
createFormHook({
  dataTransformer: ExampleDataTransformer,
  formState: { useFormState: useExampleFormState },
  mutation: { useMutation: useExampleMutation },
  resolver: zodResolver(exampleSchema),
  resourceName: "example",
  validator: ExampleFormValidator,
});
