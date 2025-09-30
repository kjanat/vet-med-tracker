import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/api/routers/_app";
import { formatTimeInTimezone } from "@/utils/tz";

// type RouterOutputs = inferRouterOutputs<AppRouter>;
// Temporary stub type until regimen router is implemented
type RegimenData = {
  id: string;
  animalId: string;
  animalName?: string;
  medicationName?: string;
  strength?: string;
  route?: string;
  targetTime?: string;
  section?: "due" | "later" | "prn";
  isOverdue?: boolean;
};

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
  const status: RegimenStatus = regimen.isOverdue
    ? "overdue"
    : (regimen.section ?? "prn");
  return STATUS_ORDER[status];
};

const compareString = (a?: string, b?: string) =>
  (a ?? "").localeCompare(b ?? "");

const passesSectionFilter = (
  regimen: RegimenData,
  filters: DashboardFilters,
) => {
  if (regimen.section === "due" && !filters.showDue) return false;
  if (regimen.section === "later" && !filters.showLater) return false;
  if (regimen.section === "prn" && !filters.showPRN) return false;
  return !(regimen.isOverdue && !filters.showOverdue);
};

const matchesSearchQuery = (regimen: RegimenData, query: string) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return (
    regimen.animalName?.toLowerCase().includes(normalized) ||
    regimen.medicationName?.toLowerCase().includes(normalized)
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
        compareString(a.animalName, b.animalName);
    case "medication":
      return (a: RegimenData, b: RegimenData) =>
        compareString(a.medicationName, b.medicationName);
    case "status":
      return (a: RegimenData, b: RegimenData) =>
        getStatusOrder(a) - getStatusOrder(b);
    default:
      return (a: RegimenData, b: RegimenData) =>
        compareString(a.targetTime, b.targetTime);
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
    animal: regimen.animalName,
    animalId: regimen.animalId,
    dueTime: regimen.targetTime
      ? formatTimeInTimezone(new Date(regimen.targetTime), timezone)
      : "As needed",
    id: regimen.id,
    medication: [regimen.medicationName, regimen.strength]
      .filter(Boolean)
      .join(" "),
    route: regimen.route,
    status: regimen.isOverdue
      ? ("overdue" as const)
      : regimen.section === "due"
        ? ("due" as const)
        : ("upcoming" as const),
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
