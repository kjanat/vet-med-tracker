/**
 * Display service for veterinary regimens
 * Handles UI formatting, status visualization, and responsive layout management
 */

import {
  addDays,
  differenceInHours,
  format,
  formatDistanceToNow,
} from "date-fns";

export interface StatusBadge {
  text: string;
  variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
  icon?: string;
  tooltip?: string;
}

export interface ScheduleVisualization {
  timeSlots: {
    time: string;
    label: string;
    status: "upcoming" | "current" | "completed" | "missed";
    delay?: number; // minutes
  }[];
  nextDose: {
    time: string;
    countdown: string;
    isLate: boolean;
  } | null;
}

export interface ProgressIndicator {
  percentage: number;
  color: "green" | "yellow" | "red" | "blue";
  label: string;
  trend: "up" | "down" | "stable";
}

export interface FormattedRegimen {
  id: string;
  title: string;
  subtitle: string;
  badges: StatusBadge[];
  schedule: ScheduleVisualization;
  progress: ProgressIndicator;
  metadata: {
    startDate: string;
    endDate?: string;
    duration: string;
    cutoffTime: string;
  };
  actions: {
    canEdit: boolean;
    canPause: boolean;
    canArchive: boolean;
    canAdminister: boolean;
  };
}

export interface ResponsiveLayout {
  isMobile: boolean;
  columns: number;
  cardSize: "small" | "medium" | "large";
  showDetails: boolean;
  compactMode: boolean;
}

export interface ChartData {
  type: "line" | "bar" | "pie" | "progress";
  data: unknown[];
  labels: string[];
  colors: string[];
  title: string;
  subtitle?: string;
}

interface AdministrationEvent {
  scheduledTime: Date;
  actualTime?: Date;
  status: string;
}

interface RegimenSummarySource {
  status: "active" | "paused" | "ended";
  highRisk: boolean;
  timesLocal?: string[];
}

export class RegimenDisplayService {
  /**
   * Generate status badges for regimen display
   */
  static generateStatusBadges(regimen: {
    scheduleType: string;
    highRisk: boolean;
    status: "active" | "paused" | "ended";
    adherenceRate?: number;
  }): StatusBadge[] {
    const badges: StatusBadge[] = [];

    // Schedule type badge
    badges.push({
      text: regimen.scheduleType,
      tooltip: RegimenDisplayService.getScheduleTypeTooltip(
        regimen.scheduleType,
      ),
      variant: regimen.scheduleType === "FIXED" ? "default" : "secondary",
    });

    // High risk badge
    if (regimen.highRisk) {
      badges.push({
        icon: "AlertTriangle",
        text: "High-risk",
        tooltip: "Requires careful monitoring and may need co-signature",
        variant: "destructive",
      });
    }

    // Status badge
    if (regimen.status === "paused") {
      badges.push({
        icon: "Pause",
        text: "Paused",
        tooltip: "Medication regimen is temporarily paused",
        variant: "outline",
      });
    } else if (regimen.status === "ended") {
      badges.push({
        icon: "CheckCircle",
        text: "Ended",
        tooltip: "Medication regimen has been completed",
        variant: "secondary",
      });
    }

    // Adherence badge
    if (regimen.adherenceRate !== undefined) {
      const adherenceVariant = RegimenDisplayService.getAdherenceVariant(
        regimen.adherenceRate,
      );
      badges.push({
        text: `${Math.round(regimen.adherenceRate)}% adherence`,
        tooltip: RegimenDisplayService.getAdherenceTooltip(
          regimen.adherenceRate,
        ),
        variant: adherenceVariant,
      });
    }

    return badges;
  }

  /**
   * Create schedule visualization
   */
  static createScheduleVisualization(
    scheduleTimes: string[],
    _timezone: string,
    lastAdministrations: AdministrationEvent[] = [],
  ): ScheduleVisualization {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const timeSlots = scheduleTimes.map((timeString) =>
      RegimenDisplayService.processTimeSlot(
        timeString,
        today,
        now,
        lastAdministrations,
      ),
    );

    const nextDose = RegimenDisplayService.findNextDose(timeSlots, today, now);

    return {
      nextDose,
      timeSlots,
    };
  }

  private static processTimeSlot(
    timeString: string,
    today: Date,
    now: Date,
    lastAdministrations: AdministrationEvent[],
  ): {
    time: string;
    label: string;
    status: "upcoming" | "current" | "completed" | "missed";
    delay?: number;
  } {
    const [hours, minutes] = timeString.split(":").map(Number);
    const scheduleTime = new Date(today);
    scheduleTime.setHours(hours || 0, minutes || 0, 0, 0);

    const adminRecord = lastAdministrations.find((record) => {
      const recordTime = new Date(record.scheduledTime);
      return (
        recordTime.getHours() === hours && recordTime.getMinutes() === minutes
      );
    });

    const { status, delay } = RegimenDisplayService.determineSlotStatus(
      adminRecord,
      now,
      scheduleTime,
    );

    return {
      delay,
      label: format(scheduleTime, "h:mm a"),
      status,
      time: timeString,
    };
  }

  private static determineSlotStatus(
    adminRecord:
      | { scheduledTime: Date; actualTime?: Date; status: string }
      | undefined,
    now: Date,
    scheduleTime: Date,
  ): {
    status: "upcoming" | "current" | "completed" | "missed";
    delay?: number;
  } {
    if (adminRecord) {
      if (adminRecord.status === "GIVEN" || adminRecord.status === "LATE") {
        let delay: number | undefined;
        if (adminRecord.actualTime) {
          delay =
            Math.abs(
              adminRecord.actualTime.getTime() -
                adminRecord.scheduledTime.getTime(),
            ) /
            (1000 * 60);
        }
        return { delay, status: "completed" };
      }
      if (adminRecord.status === "MISSED") {
        return { status: "missed" };
      }
    }

    const hoursPassed = differenceInHours(now, scheduleTime);
    if (hoursPassed > 4) {
      return { status: "missed" };
    }
    if (hoursPassed > -1 && hoursPassed < 1) {
      return { status: "current" };
    }

    return { status: "upcoming" };
  }

  private static findNextDose(
    timeSlots: {
      time: string;
      label: string;
      status: "upcoming" | "current" | "completed" | "missed";
    }[],
    today: Date,
    now: Date,
  ): {
    time: string;
    countdown: string;
    isLate: boolean;
  } | null {
    const upcomingSlots = timeSlots.filter(
      (slot) => slot.status === "upcoming",
    );

    if (upcomingSlots.length === 0) {
      // If no upcoming slots today, find the first slot for tomorrow
      if (timeSlots.length > 0) {
        const firstSlot = timeSlots[0];
        if (firstSlot) {
          const [hours, minutes] = firstSlot.time.split(":").map(Number);
          const nextTime = addDays(today, 1);
          nextTime.setHours(hours || 0, minutes || 0, 0, 0);
          return {
            countdown: formatDistanceToNow(nextTime, { addSuffix: true }),
            isLate: false,
            time: format(nextTime, "h:mm a"),
          };
        }
      }
      return null;
    }

    const nextSlot = upcomingSlots[0];
    if (!nextSlot) return null;

    const [hours, minutes] = nextSlot.time.split(":").map(Number);
    const nextTime = new Date(today);
    nextTime.setHours(hours || 0, minutes || 0, 0, 0);

    if (nextTime < now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    return {
      countdown: formatDistanceToNow(nextTime, { addSuffix: true }),
      isLate: nextTime < now,
      time: format(nextTime, "h:mm a"),
    };
  }

  /**
   * Generate progress indicator
   */
  static createProgressIndicator(
    adherenceRate: number,
    trend: "IMPROVING" | "DECLINING" | "STABLE" = "STABLE",
  ): ProgressIndicator {
    let color: "green" | "yellow" | "red" | "blue";
    let label: string;

    if (adherenceRate >= 90) {
      color = "green";
      label = "Excellent";
    } else if (adherenceRate >= 75) {
      color = "blue";
      label = "Good";
    } else if (adherenceRate >= 60) {
      color = "yellow";
      label = "Needs improvement";
    } else {
      color = "red";
      label = "Poor adherence";
    }

    return {
      color,
      label,
      percentage: adherenceRate,
      trend:
        trend === "IMPROVING"
          ? "up"
          : trend === "DECLINING"
            ? "down"
            : "stable",
    };
  }

  /**
   * Format regimen for display
   */
  static formatRegimenForDisplay(
    regimen: {
      id: string;
      animalName: string;
      medicationName: string;
      strength?: string;
      route: string;
      form: string;
      scheduleType: string;
      timesLocal?: string[];
      startDate: Date;
      endDate?: Date;
      cutoffMins: number;
      highRisk: boolean;
      status: "active" | "paused" | "ended";
      isActive: boolean;
    },
    adherenceData?: {
      rate: number;
      trend: "IMPROVING" | "DECLINING" | "STABLE";
      lastAdministrations: AdministrationEvent[];
    },
  ): FormattedRegimen {
    // Create title and subtitle
    const title = regimen.medicationName;
    const subtitle =
      `${regimen.strength || ""} ${regimen.form} • ${regimen.route}`
        .replace(/^\s+|\s+$/g, "")
        .replace(/\s+/g, " ");

    // Generate badges
    const badges = RegimenDisplayService.generateStatusBadges({
      adherenceRate: adherenceData?.rate,
      highRisk: regimen.highRisk,
      scheduleType: regimen.scheduleType,
      status: regimen.status,
    });

    // Create schedule visualization
    const schedule = RegimenDisplayService.createScheduleVisualization(
      regimen.timesLocal || [],
      "UTC", // Would use actual timezone
      adherenceData?.lastAdministrations || [],
    );

    // Create progress indicator
    const progress = adherenceData
      ? RegimenDisplayService.createProgressIndicator(
          adherenceData.rate,
          adherenceData.trend,
        )
      : RegimenDisplayService.createProgressIndicator(0, "STABLE");

    // Format metadata
    const metadata = {
      cutoffTime: `${regimen.cutoffMins} minutes`,
      duration: regimen.endDate
        ? formatDistanceToNow(regimen.endDate, { addSuffix: false })
        : "Ongoing",
      endDate: regimen.endDate
        ? format(regimen.endDate, "MMM d, yyyy")
        : undefined,
      startDate: format(regimen.startDate, "MMM d, yyyy"),
    };

    // Determine available actions
    const actions = {
      canAdminister:
        regimen.status === "active" && regimen.scheduleType !== "PRN",
      canArchive: true,
      canEdit: regimen.status === "active",
      canPause: regimen.status === "active",
    };

    return {
      actions,
      badges,
      id: regimen.id,
      metadata,
      progress,
      schedule,
      subtitle,
      title,
    };
  }

  /**
   * Calculate responsive layout settings
   */
  static calculateResponsiveLayout(
    screenWidth: number,
    regimenCount: number,
    detailLevel: "minimal" | "standard" | "detailed" = "standard",
  ): ResponsiveLayout {
    const isMobile = screenWidth < 768;
    let columns: number;
    let cardSize: "small" | "medium" | "large";
    let showDetails: boolean;
    let compactMode: boolean;

    if (isMobile) {
      columns = 1;
      cardSize = detailLevel === "minimal" ? "small" : "medium";
      showDetails = detailLevel === "detailed";
      compactMode = regimenCount > 5;
    } else if (screenWidth < 1024) {
      columns = 2;
      cardSize = "medium";
      showDetails = detailLevel !== "minimal";
      compactMode = regimenCount > 8;
    } else {
      columns = regimenCount > 6 ? 3 : 2;
      cardSize = detailLevel === "detailed" ? "large" : "medium";
      showDetails = true;
      compactMode = regimenCount > 12;
    }

    return {
      cardSize,
      columns,
      compactMode,
      isMobile,
      showDetails,
    };
  }

  /**
   * Generate chart data for adherence visualization
   */
  static generateAdherenceChart(
    data: { period: string; adherence: number }[],
    type: "line" | "bar" = "line",
  ): ChartData {
    const chartData = data.map((item) => item.adherence);
    const labels = data.map((item) => item.period);

    const colors = data.map((item) => {
      if (item.adherence >= 90) return "#10b981"; // green
      if (item.adherence >= 75) return "#3b82f6"; // blue
      if (item.adherence >= 60) return "#f59e0b"; // yellow
      return "#ef4444"; // red
    });

    return {
      colors,
      data: chartData,
      labels,
      subtitle: "Percentage of doses taken as scheduled",
      title: "Medication Adherence Trend",
      type,
    };
  }

  /**
   * Format time for display with timezone support
   */
  static formatTimeForDisplay(
    time: string | Date,
    _timezone?: string,
    format12Hour: boolean = true,
  ): string {
    if (typeof time === "string") {
      // Handle HH:mm format
      if (time.includes(":")) {
        const [hours, minutes] = time.split(":");
        const tempDate = new Date();
        tempDate.setHours(
          parseInt(hours || "0", 10),
          parseInt(minutes || "0", 10),
          0,
          0,
        );
        return format(tempDate, format12Hour ? "h:mm a" : "HH:mm");
      }
      // Handle full date string
      time = new Date(time);
    }

    return format(time, format12Hour ? "h:mm a" : "HH:mm");
  }

  /**
   * Create summary statistics for display
   */
  static createSummaryStats(
    regimens: RegimenSummarySource[],
    adherenceData: Record<string, number> = {},
  ): {
    total: number;
    active: number;
    highRisk: number;
    averageAdherence: number;
    upcomingDoses: number;
  } {
    const total = regimens.length;
    const active = regimens.filter((r) => r.status === "active").length;
    const highRisk = regimens.filter((r) => r.highRisk).length;

    const adherenceRates = Object.values(adherenceData).filter(
      (rate) => rate > 0,
    );
    const averageAdherence =
      adherenceRates.length > 0
        ? adherenceRates.reduce((sum, rate) => sum + rate, 0) /
          adherenceRates.length
        : 0;

    // Calculate upcoming doses (next 24 hours)
    const now = new Date();
    const _tomorrow = addDays(now, 1);
    let upcomingDoses = 0;

    regimens.forEach((regimen) => {
      if (regimen.status === "active" && regimen.timesLocal) {
        upcomingDoses += regimen.timesLocal.length; // Simplified calculation
      }
    });

    return {
      active,
      averageAdherence: Math.round(averageAdherence),
      highRisk,
      total,
      upcomingDoses,
    };
  }

  // Helper methods
  private static getScheduleTypeTooltip(scheduleType: string): string {
    const tooltips: Record<string, string> = {
      FIXED: "Medication given at specific times each day",
      INTERVAL: "Medication given at regular intervals",
      PRN: "Medication given as needed",
      TAPER: "Medication dosage gradually reduced over time",
    };
    return tooltips[scheduleType] || "Medication schedule";
  }

  private static getAdherenceVariant(rate: number): StatusBadge["variant"] {
    if (rate >= 90) return "default"; // green
    if (rate >= 75) return "secondary"; // blue
    if (rate >= 60) return "warning"; // yellow
    return "destructive"; // red
  }

  private static getAdherenceTooltip(rate: number): string {
    if (rate >= 90) return "Excellent medication adherence";
    if (rate >= 75) return "Good medication adherence";
    if (rate >= 60) return "Medication adherence needs improvement";
    return "Poor medication adherence - contact veterinarian";
  }
}
