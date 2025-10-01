"use client";

import { useCallback } from "react";
import {
  type DefaultValues,
  type FieldValues,
  type Resolver,
  useForm,
} from "react-hook-form";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useFormErrorHandler } from "@/hooks/shared/useErrorHandler.ts";
import { showSuccessToast } from "@/lib/utils/toast-helpers";

/**
 * Base form state interface that all forms should implement
 */
interface BaseFormState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
}

/**
 * Base form actions interface that all forms should implement
 */
interface BaseFormActions<TFormData> {
  openForm: (data?: TFormData | null) => void;
  closeForm: () => void;
  saveForm: (data: TFormData) => Promise<void>;
  resetForm: () => void;
  setDirty: (dirty: boolean) => void;
  clearError: () => void;
  setError: (error: string | null) => void;
}
/**
 * Configuration for form hook factory
 */
export type FormValidationIssue = {
  field: string;
  message: string;
};

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationIssue[];
  warnings: string[];
}

export interface FormMutationAdapter<TPayload, TResult = unknown> {
  mutateAsync: (payload: TPayload) => Promise<TResult>;
  isPending?: boolean;
}

interface FormHookConfig<TFormData extends FieldValues, TApiData> {
  resolver: Resolver<TFormData>;
  dataTransformer: {
    toApiPayload: (formData: TFormData, context: unknown) => TApiData;
    setDefaultValues: (
      options?: Partial<TFormData>,
    ) => DefaultValues<TFormData>;
  };
  validator?: {
    validate: (formData: TFormData) => FormValidationResult;
    getDisplayMessage?: (result: FormValidationResult) => string | null;
  };
  mutation: {
    useMutation: () => FormMutationAdapter<TApiData>;
  };
  formState: {
    useFormState: () => BaseFormState & BaseFormActions<TFormData>;
  };
  resourceName: string; // For toast messages: "animal", "inventory", etc.
}

/**
 * Form hook factory that creates standardized form hooks
 * Eliminates duplication between useAnimalForm, etc.
 */
export function createFormHook<TFormData extends FieldValues, TApiData>(
  config: FormHookConfig<TFormData, TApiData>,
) {
  return function useGeneratedForm(
    options: {
      onSave?: (data: TFormData) => Promise<void> | void;
      onClose?: () => void;
    } = {},
  ) {
    const { selectedHousehold } = useApp();
    const { handleSubmissionError, handleValidationError } =
      useFormErrorHandler();

    const {
      dataTransformer,
      formState: formStateFactory,
      mutation: mutationFactory,
      resourceName,
      resolver,
      validator,
    } = config;

    const formState = formStateFactory.useFormState();

    // React Hook Form setup
    const form = useForm<TFormData>({
      defaultValues: dataTransformer.setDefaultValues(),
      resolver,
    });

    // tRPC mutation setup
    const mutation = mutationFactory.useMutation();

    /**
     * Save form data with validation and error handling
     */
    const saveForm = useCallback(
      async (data: TFormData) => {
        try {
          // Clear any existing errors
          formState.clearError();

          // Validate form data if validator provided
          if (validator) {
            const validationResult = validator.validate(data);
            if (!validationResult.isValid) {
              handleValidationError(validationResult, (field, error) => {
                if (field === "root") {
                  formState.setError(error.message);
                }
              });
              return;
            }
          }

          // Transform form data to API payload
          const apiPayload = dataTransformer.toApiPayload(
            data,
            selectedHousehold,
          );

          // Execute mutation
          await mutation.mutateAsync(apiPayload);

          // Handle success
          showSuccessToast("saved", resourceName);

          // Call custom onSave callback if provided
          if (options.onSave) {
            await options.onSave(data);
          }

          // Close form and reset
          formState.closeForm();
          form.reset();
          formState.setDirty(false);
        } catch (error) {
          handleSubmissionError(
            error,
            `save-${resourceName}`,
            (field, formError) => {
              if (field === "root") {
                formState.setError(formError.message);
              }
            },
          );
        }
      },
      [
        selectedHousehold,
        dataTransformer.toApiPayload,
        mutation,
        form,
        formState,
        options.onSave,
        handleSubmissionError,
        handleValidationError,
        resourceName,
        validator,
      ],
    );

    /**
     * Reset form to default values
     */
    const resetForm = useCallback(() => {
      form.reset(dataTransformer.setDefaultValues());
      formState.setDirty(false);
      formState.clearError();
    }, [dataTransformer, form, formState]);

    /**
     * Open form with optional initial data
     */
    const openForm = useCallback(
      (initialData?: TFormData | null) => {
        const defaultValues = initialData || dataTransformer.setDefaultValues();
        form.reset(defaultValues);
        formState.openForm(initialData);
        formState.clearError();
      },
      [dataTransformer, form, formState],
    );

    /**
     * Close form with cleanup
     */
    const closeForm = useCallback(() => {
      formState.closeForm();
      resetForm();
      if (options.onClose) {
        options.onClose();
      }
    }, [formState, resetForm, options.onClose]);

    return {
      clearError: formState.clearError,
      closeForm,
      error: formState.error,

      // Form instance
      form,
      isDirty: formState.isDirty,
      isLoading: mutation.isPending || formState.isLoading,
      // Form state
      isOpen: formState.isOpen,

      // Mutations (for backward compatibility)
      mutation,

      // Actions
      openForm,
      resetForm,
      saveForm,
      setDirty: formState.setDirty,
    };
  };
}
