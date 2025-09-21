/**
 * Navigation Service
 * Centralized navigation logic for medical workflows
 * Provides consistent routing and URL management
 */

export interface NavigationContext {
  householdId?: string;
  animalId?: string;
  regimenId?: string;
}

export interface RouterLike {
  push: (url: string) => undefined | Promise<boolean>;
}

export class NavigationService {
  /**
   * Navigate to medication history for specific animal
   */
  static navigateToHistory(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for history navigation");
      return "/auth/dashboard";
    }

    return `/auth/manage/animals/${context.animalId}/history`;
  }

  /**
   * Navigate to insights dashboard for specific animal
   */
  static navigateToInsights(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for insights navigation");
      return "/auth/insights";
    }

    return `/auth/insights?animalId=${context.animalId}`;
  }

  /**
   * Navigate to reminder settings for specific regimen
   */
  static navigateToReminderSettings(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for reminder settings");
      return "/auth/settings";
    }

    const baseUrl = `/auth/settings/reminders`;
    const params = new URLSearchParams({
      animalId: context.animalId,
    });

    if (context.regimenId) {
      params.set("regimenId", context.regimenId);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Navigate to record medication page
   */
  static navigateToRecordMedication(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for record navigation");
      return "/auth/dashboard";
    }

    return `/auth/manage/animals/${context.animalId}/record`;
  }

  /**
   * Navigate to main dashboard
   */
  static navigateToDashboard(): string {
    return "/auth/dashboard";
  }

  /**
   * Navigate to emergency card for specific animal
   */
  static navigateToEmergencyCard(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for emergency card");
      return "/auth/dashboard";
    }

    return `/auth/manage/animals/${context.animalId}/emergency`;
  }

  /**
   * Navigate to animal profile page
   */
  static navigateToAnimalProfile(context: NavigationContext): string {
    if (!context.householdId || !context.animalId) {
      console.warn("Missing householdId or animalId for animal profile");
      return "/auth/dashboard";
    }

    return `/auth/manage/animals/${context.animalId}`;
  }

  /**
   * Navigate with context preservation
   * Uses Next.js router to navigate while preserving context
   */
  static navigateWithContext(
    url: string,
    router: RouterLike,
    _options?: {
      replace?: boolean;
      shallow?: boolean;
    },
  ): void {
    try {
      router.push(url);
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to dashboard on navigation error
      router.push("/auth/dashboard");
    }
  }

  /**
   * Get breadcrumb trail for current location
   */
  static getBreadcrumbs(
    pathname: string,
    context: NavigationContext,
  ): Array<{
    label: string;
    href: string;
    current: boolean;
  }> {
    const breadcrumbs = [
      { current: false, href: "/auth/dashboard", label: "Dashboard" },
    ];

    // Parse pathname to determine breadcrumb structure
    if (pathname.includes("/animals/")) {
      if (context.animalId) {
        breadcrumbs.push({
          current: false,
          href: NavigationService.navigateToAnimalProfile(context),
          label: "Animal Profile",
        });

        if (pathname.includes("/history")) {
          breadcrumbs.push({
            current: true,
            href: NavigationService.navigateToHistory(context),
            label: "History",
          });
        } else if (pathname.includes("/emergency")) {
          breadcrumbs.push({
            current: true,
            href: NavigationService.navigateToEmergencyCard(context),
            label: "Emergency Card",
          });
        } else if (pathname.includes("/record")) {
          breadcrumbs.push({
            current: true,
            href: NavigationService.navigateToRecordMedication(context),
            label: "Record Medication",
          });
        }
      }
    } else if (pathname.includes("/insights")) {
      breadcrumbs.push({
        current: true,
        href: "/auth/insights",
        label: "Insights",
      });
    } else if (pathname.includes("/settings")) {
      breadcrumbs.push({
        current: true,
        href: "/auth/settings",
        label: "Settings",
      });
    }

    return breadcrumbs;
  }

  /**
   * Check if navigation is safe for current user context
   */
  static isNavigationSafe(url: string, context: NavigationContext): boolean {
    // Basic validation - ensure user has access to resources
    if (url.includes("/animals/") && !context.animalId) {
      return false;
    }

    if (url.includes("/households/") && !context.householdId) {
      return false;
    }

    return true;
  }
}
