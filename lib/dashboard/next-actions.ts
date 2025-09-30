import type { inferRouterOutputs } from "@trpc/server";

import type { appRouter } from "@/server/api";
import { formatTimeInTimezone } from "@/utils/tz";

type RouterOutputs = inferRouterOutputs<typeof appRouter>;
// Use actual router output type for regimen.listDue
type RegimenData = RouterOutputs["regimen"]["listDue"][number];

type RegimenStatus = "overdue" | "due" | "later" | "prn";

export type DashboardFilters = {
  showDue: boolean;
  showLater: boolean;
  showPRN: boolean;
  showOverdue: boolean;
};

export type SortKey = "time" | "animal" | "medication" | "status";
export type SortOrder = "asc" | "desc";

export const DEFAULT_FILTERS: DashboardFilters = {
  showDue: true,
  showLater: true,
  showOverdue: true,
  showPRN: false,
};

const STATUS_ORDER: Record<RegimenStatus, number> = {
  due: 1,
  later: 2,
  overdue: 0,
  prn: 3,
};

const getStatusOrder = (regimen: RegimenData) => {
  const status: RegimenStatus = regimen.isPRN ? "prn" : "due";
  return STATUS_ORDER[status];
};

const compareString = (a?: string, b?: string) =>
  (a ?? "").localeCompare(b ?? "");

const passesSectionFilter = (
  regimen: RegimenData,
  filters: DashboardFilters,
) => {
  if (regimen.isPRN && !filters.showPRN) return false;
  if (!regimen.isPRN && !filters.showDue) return false;
  return true;
};

const matchesSearchQuery = (regimen: RegimenData, query: string) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return (
    regimen.animal.name?.toLowerCase().includes(normalized) ||
    regimen.regimen.name?.toLowerCase().includes(normalized) ||
    regimen.regimen.medicationName?.toLowerCase().includes(normalized)
  );
};

const filterRegimens = (
  regimens: RegimenData[],
  filters: DashboardFilters,
  query: string,
) =>
  regimens.filter(
    (regimen) =>
      passesSectionFilter(regimen, filters) &&
      matchesSearchQuery(regimen, query),
  );

const getSortingComparator = (sortBy: SortKey) => {
  switch (sortBy) {
    case "animal":
      return (a: RegimenData, b: RegimenData) =>
        compareString(a.animal.name, b.animal.name);
    case "medication":
      return (a: RegimenData, b: RegimenData) =>
        compareString(
          a.regimen.medicationName ?? a.regimen.name,
          b.regimen.medicationName ?? b.regimen.name,
        );
    case "status":
      return (a: RegimenData, b: RegimenData) =>
        getStatusOrder(a) - getStatusOrder(b);
    default:
      return (a: RegimenData, b: RegimenData) =>
        compareString(
          a.regimen.startDate?.toString(),
          b.regimen.startDate?.toString(),
        );
  }
};

const sortRegimens = (
  regimens: RegimenData[],
  sortBy: SortKey,
  sortOrder: SortOrder,
) => {
  const comparator = getSortingComparator(sortBy);
  const sorted = [...regimens].sort(comparator);
  return sortOrder === "desc" ? sorted.reverse() : sorted;
};

export type TransformedRegimen = {
  id: string;
  animalId: string;
  animal: string;
  medication: string;
  dueTime: string;
  status: "overdue" | "due" | "upcoming";
  route?: string;
};

const transformRegimens = (regimens: RegimenData[], timezone: string) =>
  regimens.slice(0, 10).map((regimen) => ({
    animal: regimen.animal.name,
    animalId: regimen.animal.id,
    dueTime: regimen.regimen.startDate
      ? formatTimeInTimezone(new Date(regimen.regimen.startDate), timezone)
      : "As needed",
    id: regimen.regimen.id,
    medication:
      regimen.regimen.medicationName ?? regimen.regimen.name ?? "Unknown",
    route: regimen.regimen.route,
    status: regimen.isPRN ? ("upcoming" as const) : ("due" as const),
  }));

export const computeNextActions = ({
  regimens,
  filters,
  query,
  sortBy,
  sortOrder,
  timezone,
}: {
  regimens: RegimenData[] | undefined;
  filters: DashboardFilters;
  query: string;
  sortBy: SortKey;
  sortOrder: SortOrder;
  timezone: string;
}) => {
  if (!regimens) return [] as TransformedRegimen[];
  const filtered = filterRegimens(regimens, filters, query);
  const sorted = sortRegimens(filtered, sortBy, sortOrder);
  return transformRegimens(sorted, timezone);
};
