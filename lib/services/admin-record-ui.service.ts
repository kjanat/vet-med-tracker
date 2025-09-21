/**
 * AdminRecordUIService
 *
 * Handles UI state management, formatting, display logic, and user interface
 * operations for the medication administration recording interface.
 */

import type { InventorySource } from "@/types/inventory";
import type { DueRegimen } from "./admin-record-validation.service";
import type { WorkflowState } from "./admin-record-workflow.service";

type InventorySourceWithQuantity = InventorySource & { quantity?: number };

function getUnitsRemaining(source: InventorySourceWithQuantity): number {
  const quantity = source.quantity;
  if (typeof quantity === "number") {
    return quantity;
  }

  return typeof source.unitsRemaining === "number" ? source.unitsRemaining : 0;
}

export interface UIState {
  isLoading: boolean;
  error: Error | null;
  showValidation: boolean;
  expandedSections: string[];
  selectedTabIndex: number;
}

export interface DisplayRegimen extends DueRegimen {
  timeDisplay: string;
  complianceDisplay: string;
  urgencyLevel: "critical" | "high" | "medium" | "low";
  statusBadges: Array<{
    variant: "destructive" | "secondary" | "outline";
    text: string;
  }>;
}

export interface LayoutProps {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface FormattedInventorySource extends InventorySource {
  displayName: string;
  statusText: string;
  canUse: boolean;
  requiresOverride: boolean;
}

export class AdminRecordUIService {
  /**
   * Creates initial UI state
   */
  static createInitialUIState(): UIState {
    return {
      error: null,
      expandedSections: ["due"], // Default to showing due medications
      isLoading: false,
      selectedTabIndex: 0,
      showValidation: false,
    };
  }

  /**
   * Formats regimen data for display with UI enhancements
   */
  static formatRegimenForDisplay(
    regimen: DueRegimen,
    timezone: string,
  ): DisplayRegimen {
    const timeDisplay = regimen.targetTime
      ? AdminRecordUIService.formatTimeLocal(
          new Date(regimen.targetTime),
          timezone,
        )
      : "As needed";

    const complianceDisplay = `${regimen.compliance}% compliance`;
    const urgencyLevel = AdminRecordUIService.determineUrgencyLevel(regimen);
    const statusBadges = AdminRecordUIService.generateStatusBadges(regimen);

    return {
      ...regimen,
      complianceDisplay,
      statusBadges,
      timeDisplay,
      urgencyLevel,
    };
  }

  /**
   * Formats inventory sources for display with status information
   */
  static formatInventorySourcesForDisplay(
    sources: InventorySource[],
    medicationName: string,
    allowOverride: boolean,
  ): FormattedInventorySource[] {
    return sources
      .filter((source) =>
        source.name.toLowerCase().includes(medicationName.toLowerCase()),
      )
      .map((source) => ({
        ...source,
        canUse: AdminRecordUIService.canUseInventorySource(
          source,
          allowOverride,
        ),
        displayName: AdminRecordUIService.createInventoryDisplayName(source),
        requiresOverride:
          (source.isExpired || source.isWrongMed) && !allowOverride,
        statusText: AdminRecordUIService.createInventoryStatusText(source),
      }));
  }

  /**
   * Determines urgency level based on regimen status
   */
  private static determineUrgencyLevel(
    regimen: DueRegimen,
  ): "critical" | "high" | "medium" | "low" {
    if (
      regimen.isOverdue &&
      regimen.minutesUntilDue &&
      Math.abs(regimen.minutesUntilDue) > 240
    ) {
      return "critical"; // Over 4 hours overdue
    }

    if (regimen.isOverdue) {
      return "high"; // Overdue but less than 4 hours
    }

    if (regimen.section === "due") {
      return "medium"; // Due now
    }

    return "low"; // Later or PRN
  }

  /**
   * Generates status badges for regimen display
   */
  private static generateStatusBadges(regimen: DueRegimen): Array<{
    variant: "destructive" | "secondary" | "outline";
    text: string;
  }> {
    const badges: Array<{
      variant: "destructive" | "secondary" | "outline";
      text: string;
    }> = [];

    if (regimen.isOverdue) {
      badges.push({ text: "Overdue", variant: "destructive" });
    }

    if (regimen.isPRN) {
      badges.push({ text: "PRN", variant: "outline" });
    }

    if (regimen.isHighRisk) {
      badges.push({ text: "High-risk", variant: "secondary" });
    }

    return badges;
  }

  /**
   * Creates display name for inventory source
   */
  private static createInventoryDisplayName(source: InventorySource): string {
    let displayName = source.name;

    if (source.brandName) {
      displayName += ` (${source.brandName})`;
    }

    if (source.expiresOn) {
      const expDate = new Date(source.expiresOn);
      displayName += ` - Exp: ${expDate.toLocaleDateString()}`;
    }

    return displayName;
  }

  /**
   * Creates status text for inventory source
   */
  private static createInventoryStatusText(source: InventorySource): string {
    const statuses: string[] = [];

    const remainingUnits = getUnitsRemaining(source);

    if (remainingUnits <= 1) {
      statuses.push("Low stock");
    }

    if (source.isExpired) {
      statuses.push("Expired");
    }

    if (source.isWrongMed) {
      statuses.push("Medication mismatch");
    }

    if (statuses.length === 0) {
      statuses.push(`${remainingUnits} available`);
    }

    return statuses.join(" • ");
  }

  /**
   * Determines if inventory source can be used
   */
  private static canUseInventorySource(
    source: InventorySource,
    allowOverride: boolean,
  ): boolean {
    const remainingUnits = getUnitsRemaining(source);
    if (remainingUnits <= 0) return false;
    if ((source.isExpired || source.isWrongMed) && !allowOverride) return false;
    return true;
  }

  /**
   * Formats time for local display
   */
  private static formatTimeLocal(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date);
  }

  /**
   * Groups regimens by section with counts
   */
  static groupRegimensWithCounts(
    regimens: DueRegimen[],
    selectedAnimalId: string | null,
  ): {
    due: { regimens: DueRegimen[]; count: number };
    later: { regimens: DueRegimen[]; count: number };
    prn: { regimens: DueRegimen[]; count: number };
  } {
    const filteredRegimens = selectedAnimalId
      ? regimens.filter((r) => r.animalId === selectedAnimalId)
      : regimens;

    const due = filteredRegimens.filter((r) => r.section === "due");
    const later = filteredRegimens.filter((r) => r.section === "later");
    const prn = filteredRegimens.filter((r) => r.section === "prn");

    return {
      due: { count: due.length, regimens: due },
      later: { count: later.length, regimens: later },
      prn: { count: prn.length, regimens: prn },
    };
  }

  /**
   * Generates section badge variant based on count and urgency
   */
  static getSectionBadgeVariant(
    section: "due" | "later" | "prn",
    count: number,
  ): "destructive" | "secondary" | "outline" {
    if (section === "due" && count > 0) return "destructive";
    if (section === "later" && count > 0) return "secondary";
    return "outline";
  }

  /**
   * Creates loading state display
   */
  static createLoadingDisplay(itemCount = 3) {
    return Array.from({ length: itemCount }, (_, index) => ({
      height: "h-20",
      id: `skeleton-${index}`,
      type: "skeleton" as const,
    }));
  }

  /**
   * Formats submit button text based on state
   */
  static getSubmitButtonText(
    isSubmitting: boolean,
    requiresCoSign: boolean,
    hasErrors: boolean,
  ): string {
    if (isSubmitting) {
      return "Recording...";
    }

    if (hasErrors) {
      return "Please resolve issues";
    }

    if (requiresCoSign) {
      return "Hold to Confirm (3s) - Co-sign Required";
    }

    return "Hold to Confirm (3s)";
  }

  /**
   * Determines if submit button should be disabled
   */
  static shouldDisableSubmit(
    isSubmitting: boolean,
    hasValidationErrors: boolean,
    inventoryIssues: boolean,
    allowOverride: boolean,
  ): boolean {
    return (
      isSubmitting || hasValidationErrors || (inventoryIssues && !allowOverride)
    );
  }

  /**
   * Creates success message text
   */
  static createSuccessMessage(
    animalName?: string,
    medicationName?: string,
    recordedAt?: string,
    timezone = "UTC",
  ): { title: string; subtitle: string } {
    const timeText = recordedAt
      ? AdminRecordUIService.formatTimeLocal(new Date(recordedAt), timezone)
      : AdminRecordUIService.formatTimeLocal(new Date(), timezone);

    return {
      subtitle:
        animalName && medicationName
          ? `${medicationName} for ${animalName} recorded at ${timeText}`
          : `Recorded at ${timeText} by You`,
      title: "Recorded Successfully",
    };
  }

  /**
   * Gets appropriate icon for regimen urgency
   */
  static getUrgencyIcon(
    urgency: "critical" | "high" | "medium" | "low",
  ): string {
    switch (urgency) {
      case "critical":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "🔔";
      case "low":
        return "ℹ️";
      default:
        return "ℹ️";
    }
  }

  /**
   * Creates error display information
   */
  static formatErrorDisplay(error: Error | null): {
    show: boolean;
    title: string;
    message: string;
  } {
    if (!error) {
      return { message: "", show: false, title: "" };
    }

    return {
      message: error.message || "An unexpected error occurred",
      show: true,
      title: "Error",
    };
  }

  /**
   * Determines layout component to use based on device
   */
  static getLayoutComponent(
    layout: LayoutProps,
  ): "mobile" | "tablet" | "desktop" {
    if (layout.isMobile) return "mobile";
    if (layout.isTablet) return "tablet";
    return "desktop";
  }

  /**
   * Creates navigation breadcrumb information
   */
  static createBreadcrumb(
    step: WorkflowState["step"],
    animalName?: string,
    medicationName?: string,
  ): Array<{ text: string; active: boolean }> {
    const items = [
      { active: step === "select", text: "Select Medication" },
      { active: step === "confirm", text: "Confirm Details" },
      { active: step === "success", text: "Success" },
    ];

    if (step === "confirm" && animalName && medicationName && items[1]) {
      items[1].text = `Confirm ${medicationName} for ${animalName}`;
    }

    return items;
  }

  /**
   * Formats condition tags for display
   */
  static formatConditionTags(tags: string[]): Array<{
    name: string;
    selected: boolean;
    variant: "default" | "outline";
  }> {
    const availableTags = [
      "Normal",
      "Improved",
      "No Change",
      "Worse",
      "Side Effects",
    ];

    return availableTags.map((tag) => ({
      name: tag,
      selected: tags.includes(tag),
      variant: tags.includes(tag) ? ("default" as const) : ("outline" as const),
    }));
  }

  /**
   * Creates photo upload status display
   */
  static getPhotoUploadStatus(photoUrls: string[]): {
    count: number;
    canAddMore: boolean;
    statusText: string;
  } {
    const count = photoUrls.length;
    const maxPhotos = 4;
    const canAddMore = count < maxPhotos;

    let statusText = "";
    if (count === 0) {
      statusText = "No photos added";
    } else if (count === 1) {
      statusText = "1 photo added";
    } else {
      statusText = `${count} photos added`;
    }

    if (count >= maxPhotos) {
      statusText += " (maximum reached)";
    }

    return {
      canAddMore,
      count,
      statusText,
    };
  }

  /**
   * Validates UI form completeness for display
   */
  static getFormCompleteness(state: WorkflowState): {
    percentage: number;
    missingFields: string[];
    isComplete: boolean;
  } {
    const requiredFields: Array<{
      field: keyof WorkflowState;
      label: string;
      required: boolean;
    }> = [
      { field: "selectedRegimen", label: "Medication", required: true },
      {
        field: "inventorySourceId",
        label: "Inventory source",
        required: false,
      },
      {
        field: "notes",
        label: "Notes",
        required: state.selectedRegimen?.isPRN || false,
      },
      { field: "site", label: "Site/Side", required: false },
    ];

    const missingFields: string[] = [];
    let completedRequiredFields = 0;
    const totalRequiredFields = requiredFields.filter((f) => f.required).length;

    for (const { field, label, required } of requiredFields) {
      const value = state[field];
      const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(value);

      if (required) {
        if (hasValue) {
          completedRequiredFields++;
        } else {
          missingFields.push(label);
        }
      }
    }

    const percentage =
      totalRequiredFields > 0
        ? (completedRequiredFields / totalRequiredFields) * 100
        : 100;

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      percentage: Math.round(percentage),
    };
  }
}
