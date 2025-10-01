// Generic data transformer base class

export interface TransformerConfig<TForm, TApi> {
  toApi: (formData: TForm, context: Record<string, unknown>) => TApi;
  toForm: (apiData: TApi) => TForm;
  defaultValues: () => TForm;
}

export abstract class BaseDataTransformer<TForm, TApi> {
  abstract toApi(
    formData: TForm,
    context: Record<string, unknown>,
  ): TApi | Omit<TApi, "id" | "createdAt" | "updatedAt">;
  abstract toForm(apiData: TApi): TForm;
  abstract createDefaultValues(options?: Record<string, unknown>): TForm;

  toInstrumentationData(
    data: TForm,
    isNew: boolean,
    resourceId?: string,
    eventPrefix?: string,
  ) {
    const prefix = eventPrefix || "resource";
    return {
      detail: { data, isNew, resourceId },
      eventType: isNew ? `${prefix}:created` : `${prefix}:updated`,
    };
  }

  toApiPayload(
    data: TForm,
    context: Record<string, unknown>,
    resourceId?: string,
  ): TApi | Omit<TApi, "id" | "createdAt" | "updatedAt"> {
    const apiData = this.toApi(data, context);
    if (resourceId) {
      return { ...apiData, id: resourceId } as TApi;
    }
    return apiData;
  }

  toUpdatePayload(
    data: TForm,
    resourceId: string,
    context: Record<string, unknown> = {},
  ): TApi {
    return this.toApiPayload(data, context, resourceId) as TApi;
  }

  toCreatePayload(
    data: TForm,
    context: Record<string, unknown> = {},
  ): Omit<TApi, "id" | "createdAt" | "updatedAt"> {
    return this.toApiPayload(data, context);
  }

  calculateCompleteness(data: TForm): number {
    const values = Object.values(data as object);
    const nonEmpty = values.filter(
      (v) =>
        v !== undefined &&
        v !== "" &&
        v !== null &&
        !(Array.isArray(v) && v.length === 0),
    );
    return values.length > 0 ? (nonEmpty.length / values.length) * 100 : 0;
  }

  hasRequiredFields(data: TForm, requiredKeys: (keyof TForm)[]): boolean {
    return requiredKeys.every((key) => {
      const value = data[key];
      return (
        value !== undefined &&
        value !== "" &&
        value !== null &&
        !(Array.isArray(value) && value.length === 0)
      );
    });
  }

  isCompleteRecord(data: TForm, requiredKeys: (keyof TForm)[]): boolean {
    return this.hasRequiredFields(data, requiredKeys);
  }
}

// Type conversion utilities
export function parseStringToNumber(
  value: string | null | undefined,
): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseNumberToString(
  value: number | null | undefined,
): string | undefined {
  return value !== null && value !== undefined ? value.toString() : undefined;
}

export function parseDateToString(
  date: Date | null | undefined,
): string | undefined {
  return date instanceof Date ? date.toISOString() : undefined;
}

export function parseStringToDate(
  value: string | null | undefined,
): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Array utilities
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

// Field extraction utilities for transformers
export function extractOptionalString(
  value: string | null | undefined,
): string | undefined {
  return value || undefined;
}

export function extractRequiredString(
  value: string | null | undefined,
  fallback: string,
): string {
  return value || fallback;
}

export function extractOptionalDate(
  value: Date | null | undefined,
): Date | undefined {
  return value || undefined;
}

export function extractBoolean(
  value: boolean | null | undefined,
  fallback = false,
): boolean {
  return value ?? fallback;
}

export function extractOptionalArray<T>(
  value: T[] | null | undefined,
): T[] | undefined {
  return value && value.length > 0 ? value : undefined;
}

export function extractRequiredArray<T>(value: T[] | null | undefined): T[] {
  return value || [];
}
