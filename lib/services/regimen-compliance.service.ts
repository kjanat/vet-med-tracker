/**
 * Compliance tracking service for veterinary regimens
 * Handles adherence monitoring, scoring, and alert generation
 */

import {
  differenceInDays,
  differenceInHours,
  format,
  parseISO,
  subDays,
} from "date-fns";

export interface ComplianceRecord {
  regimenId: string;
  animalId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: "GIVEN" | "MISSED" | "LATE" | "PENDING";
  notes?: string;
  administeredBy?: string;
  dosage?: string;
}

export interface ComplianceScore {
  overall: number; // 0-100
  timingScore: number; // 0-100
  adherenceScore: number; // 0-100
  trend: "IMPROVING" | "DECLINING" | "STABLE";
  period: number; // days analyzed
}

export interface ComplianceAlert {
  type: "MISSED_DOSE" | "LATE_DOSE" | "POOR_ADHERENCE" | "IMPROVEMENT_NEEDED";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  regimenId: string;
  animalName: string;
  medicationName: string;
  scheduledTime?: Date;
  action?: string;
}

export interface AdherenceReport {
  period: { start: Date; end: Date };
  totalDoses: number;
  givenDoses: number;
  missedDoses: number;
  lateDoses: number;
  adherenceRate: number; // percentage
  averageDelay: number; // minutes
  complianceScore: ComplianceScore;
  trends: {
    weekly: number[];
    monthly: number[];
  };
  recommendations: string[];
}

export interface ProgressMetrics {
  currentStreak: number; // consecutive days with all doses
  longestStreak: number;
  totalDaysActive: number;
  missedDosesByDay: Record<string, number>; // day of week -> count
  timeDistribution: Record<string, number>; // time period -> count
}

type TimeOfDayBucket =
  | "Morning (6-12)"
  | "Afternoon (12-18)"
  | "Evening (18-22)"
  | "Night (22-6)";

export class RegimenComplianceService {
  /**
   * Calculate comprehensive compliance score
   */
  static calculateComplianceScore(
    records: ComplianceRecord[],
    periodDays: number = 30,
  ): ComplianceScore {
    if (records.length === 0) {
      return {
        adherenceScore: 0,
        overall: 0,
        period: periodDays,
        timingScore: 0,
        trend: "STABLE",
      };
    }

    const periodStart = subDays(new Date(), periodDays);
    const periodRecords = records.filter(
      (record) => record.scheduledTime >= periodStart,
    );

    // Calculate adherence score (percentage of doses taken)
    const totalDoses = periodRecords.length;
    const givenDoses = periodRecords.filter(
      (record) => record.status === "GIVEN" || record.status === "LATE",
    ).length;
    const adherenceScore = totalDoses > 0 ? (givenDoses / totalDoses) * 100 : 0;

    // Calculate timing score (how close to scheduled time)
    const timedDoses = periodRecords.filter(
      (record) =>
        record.actualTime &&
        (record.status === "GIVEN" || record.status === "LATE"),
    );

    let timingScore = 100;
    if (timedDoses.length > 0) {
      const delays = timedDoses.map((record) => {
        const scheduledTime = record.scheduledTime.getTime();
        const actualTime = record.actualTime?.getTime();
        return actualTime
          ? Math.abs(actualTime - scheduledTime) / (1000 * 60)
          : 0; // minutes
      });

      const averageDelay =
        delays.reduce((sum, delay) => sum + delay, 0) / delays.length;

      // Score decreases as average delay increases
      // 0 min = 100, 30 min = 80, 60 min = 50, 120+ min = 0
      timingScore = Math.max(0, 100 - (averageDelay / 120) * 100);
    }

    // Overall score is weighted average
    const overall = adherenceScore * 0.7 + timingScore * 0.3;

    // Calculate trend
    const trend = RegimenComplianceService.calculateTrend(records, periodDays);

    return {
      adherenceScore: Math.round(adherenceScore),
      overall: Math.round(overall),
      period: periodDays,
      timingScore: Math.round(timingScore),
      trend,
    };
  }

  /**
   * Generate compliance alerts based on recent activity
   */
  static generateComplianceAlerts(
    records: ComplianceRecord[],
    regimen: {
      id: string;
      animalName: string;
      medicationName: string;
      highRisk: boolean;
    },
    cutoffMinutes: number = 240,
  ): ComplianceAlert[] {
    const alerts: ComplianceAlert[] = [];
    const now = new Date();
    const recentRecords = records.filter(
      (record) => differenceInHours(now, record.scheduledTime) <= 48,
    );

    // Check for missed doses
    const missedDoses = recentRecords.filter((record) => {
      const hoursLate = differenceInHours(now, record.scheduledTime);
      const minutesLate = hoursLate * 60;
      return record.status === "PENDING" && minutesLate > cutoffMinutes;
    });

    missedDoses.forEach((record) => {
      alerts.push({
        action: "Contact veterinarian if high-risk medication",
        animalName: regimen.animalName,
        medicationName: regimen.medicationName,
        message: `Missed dose of ${regimen.medicationName} for ${regimen.animalName}`,
        regimenId: regimen.id,
        scheduledTime: record.scheduledTime,
        severity: regimen.highRisk ? "CRITICAL" : "HIGH",
        type: "MISSED_DOSE",
      });
    });

    // Check for late doses
    const lateDoses = recentRecords.filter((record) => {
      const hoursLate = differenceInHours(now, record.scheduledTime);
      const minutesLate = hoursLate * 60;
      return (
        record.status === "PENDING" &&
        minutesLate > 30 &&
        minutesLate <= cutoffMinutes
      );
    });

    lateDoses.forEach((record) => {
      alerts.push({
        action: "Administer as soon as possible",
        animalName: regimen.animalName,
        medicationName: regimen.medicationName,
        message: `Late dose of ${regimen.medicationName} for ${regimen.animalName}`,
        regimenId: regimen.id,
        scheduledTime: record.scheduledTime,
        severity: "MEDIUM",
        type: "LATE_DOSE",
      });
    });

    // Check for poor overall adherence
    const complianceScore = RegimenComplianceService.calculateComplianceScore(
      records,
      7,
    );
    if (complianceScore.overall < 70) {
      alerts.push({
        action: "Review dosing schedule and barriers to compliance",
        animalName: regimen.animalName,
        medicationName: regimen.medicationName,
        message: `Poor medication adherence for ${regimen.animalName} (${complianceScore.overall}%)`,
        regimenId: regimen.id,
        severity: complianceScore.overall < 50 ? "HIGH" : "MEDIUM",
        type: "POOR_ADHERENCE",
      });
    }

    // Check for declining trend
    if (complianceScore.trend === "DECLINING" && complianceScore.overall < 80) {
      alerts.push({
        action: "Consider schedule adjustment or adherence support",
        animalName: regimen.animalName,
        medicationName: regimen.medicationName,
        message: `Declining adherence trend for ${regimen.animalName}`,
        regimenId: regimen.id,
        severity: "MEDIUM",
        type: "IMPROVEMENT_NEEDED",
      });
    }

    return alerts;
  }

  /**
   * Generate comprehensive adherence report
   */
  static generateAdherenceReport(
    records: ComplianceRecord[],
    periodDays: number = 30,
  ): AdherenceReport {
    const endDate = new Date();
    const startDate = subDays(endDate, periodDays);

    const periodRecords = records.filter(
      (record) =>
        record.scheduledTime >= startDate && record.scheduledTime <= endDate,
    );

    const totalDoses = periodRecords.length;
    const givenDoses = periodRecords.filter((r) => r.status === "GIVEN").length;
    const lateDoses = periodRecords.filter((r) => r.status === "LATE").length;
    const missedDoses = periodRecords.filter(
      (r) => r.status === "MISSED",
    ).length;

    const adherenceRate =
      totalDoses > 0 ? ((givenDoses + lateDoses) / totalDoses) * 100 : 0;

    // Calculate average delay for given/late doses
    const timedDoses = periodRecords.filter(
      (r) => r.actualTime && (r.status === "GIVEN" || r.status === "LATE"),
    );

    const averageDelay =
      timedDoses.length > 0
        ? timedDoses.reduce((sum, record) => {
            const delay = record.actualTime
              ? Math.abs(
                  record.actualTime.getTime() - record.scheduledTime.getTime(),
                ) /
                (1000 * 60)
              : 0;
            return sum + delay;
          }, 0) / timedDoses.length
        : 0;

    // Generate weekly trends
    const weeklyTrends: number[] = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = subDays(endDate, (week + 1) * 7);
      const weekEnd = subDays(endDate, week * 7);
      const weekRecords = periodRecords.filter(
        (r) => r.scheduledTime >= weekStart && r.scheduledTime < weekEnd,
      );

      const weekTotal = weekRecords.length;
      const weekGiven = weekRecords.filter(
        (r) => r.status === "GIVEN" || r.status === "LATE",
      ).length;
      const weekRate = weekTotal > 0 ? (weekGiven / weekTotal) * 100 : 0;

      weeklyTrends.unshift(weekRate);
    }

    // Generate monthly trends (if enough data)
    const monthlyTrends: number[] = [];
    if (periodDays >= 90) {
      for (let month = 0; month < 3; month++) {
        const monthStart = subDays(endDate, (month + 1) * 30);
        const monthEnd = subDays(endDate, month * 30);
        const monthRecords = records.filter(
          (r) => r.scheduledTime >= monthStart && r.scheduledTime < monthEnd,
        );

        const monthTotal = monthRecords.length;
        const monthGiven = monthRecords.filter(
          (r) => r.status === "GIVEN" || r.status === "LATE",
        ).length;
        const monthRate = monthTotal > 0 ? (monthGiven / monthTotal) * 100 : 0;

        monthlyTrends.unshift(monthRate);
      }
    }

    // Generate recommendations
    const recommendations = RegimenComplianceService.generateRecommendations(
      adherenceRate,
      averageDelay,
      missedDoses,
      periodRecords,
    );

    return {
      adherenceRate,
      averageDelay,
      complianceScore: RegimenComplianceService.calculateComplianceScore(
        records,
        periodDays,
      ),
      givenDoses,
      lateDoses,
      missedDoses,
      period: { end: endDate, start: startDate },
      recommendations,
      totalDoses,
      trends: {
        monthly: monthlyTrends,
        weekly: weeklyTrends,
      },
    };
  }

  /**
   * Track progress metrics and streaks
   */
  static calculateProgressMetrics(
    records: ComplianceRecord[],
  ): ProgressMetrics {
    if (records.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        missedDosesByDay: {},
        timeDistribution: {},
        totalDaysActive: 0,
      };
    }

    const dayGroups = RegimenComplianceService.groupRecordsByDay(records);
    const streaks = RegimenComplianceService.calculateStreaks(dayGroups);
    const missedDosesByDay =
      RegimenComplianceService.calculateMissedDosesByDay(records);
    const timeDistribution =
      RegimenComplianceService.calculateTimeDistribution(records);

    return {
      ...streaks,
      missedDosesByDay,
      timeDistribution,
      totalDaysActive: dayGroups.size,
    };
  }

  private static groupRecordsByDay(
    records: ComplianceRecord[],
  ): Map<string, ComplianceRecord[]> {
    const dayGroups = new Map<string, ComplianceRecord[]>();
    const sortedRecords = [...records].sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime(),
    );
    sortedRecords.forEach((record) => {
      const dayKey = format(record.scheduledTime, "yyyy-MM-dd");
      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, []);
      }
      dayGroups.get(dayKey)?.push(record);
    });
    return dayGroups;
  }

  private static calculateStreaks(dayGroups: Map<string, ComplianceRecord[]>) {
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDays = Array.from(dayGroups.keys()).sort();

    for (const day of sortedDays) {
      const dayRecords = dayGroups.get(day);
      if (!dayRecords) continue;

      const allDosesGiven = dayRecords.every(
        (record) => record.status === "GIVEN" || record.status === "LATE",
      );

      if (allDosesGiven) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const lastDay = sortedDays[sortedDays.length - 1];
    const currentStreak =
      lastDay === today ||
      (lastDay && differenceInDays(parseISO(today), parseISO(lastDay)) <= 1)
        ? tempStreak
        : 0;

    return { currentStreak, longestStreak };
  }

  private static calculateMissedDosesByDay(
    records: ComplianceRecord[],
  ): Record<string, number> {
    const missedDosesByDay: Record<string, number> = {};
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    daysOfWeek.forEach((day) => {
      missedDosesByDay[day] = 0;
    });

    records
      .filter((r) => r.status === "MISSED")
      .forEach((record) => {
        if (record.scheduledTime) {
          const dayOfWeek = daysOfWeek[record.scheduledTime.getDay()];
          if (dayOfWeek) {
            missedDosesByDay[dayOfWeek] =
              (missedDosesByDay[dayOfWeek] ?? 0) + 1;
          }
        }
      });
    return missedDosesByDay;
  }

  private static calculateTimeDistribution(
    records: ComplianceRecord[],
  ): Record<string, number> {
    const timeDistribution: Record<TimeOfDayBucket, number> = {
      "Afternoon (12-18)": 0,
      "Evening (18-22)": 0,
      "Morning (6-12)": 0,
      "Night (22-6)": 0,
    };

    records.forEach((record) => {
      const hour = record.scheduledTime?.getHours();
      if (hour === undefined) {
        return;
      }

      const bucket = RegimenComplianceService.getTimeBucket(hour);
      timeDistribution[bucket] = (timeDistribution[bucket] ?? 0) + 1;
    });
    return timeDistribution;
  }

  private static getTimeBucket(hour: number): TimeOfDayBucket {
    if (hour >= 6 && hour < 12) {
      return "Morning (6-12)";
    }
    if (hour >= 12 && hour < 18) {
      return "Afternoon (12-18)";
    }
    if (hour >= 18 && hour < 22) {
      return "Evening (18-22)";
    }
    return "Night (22-6)";
  }

  /**
   * Record dose administration
   */
  static recordDoseAdministration(
    regimenId: string,
    animalId: string,
    scheduledTime: Date,
    actualTime: Date,
    administeredBy: string,
    notes?: string,
    dosage?: string,
  ): ComplianceRecord {
    const delayMinutes =
      Math.abs(actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60);

    let status: ComplianceRecord["status"];
    if (delayMinutes <= 30) {
      status = "GIVEN";
    } else {
      status = "LATE";
    }

    return {
      actualTime,
      administeredBy,
      animalId,
      dosage,
      notes,
      regimenId,
      scheduledTime,
      status,
    };
  }

  // Helper methods
  private static calculateTrend(
    records: ComplianceRecord[],
    periodDays: number,
  ): "IMPROVING" | "DECLINING" | "STABLE" {
    const halfPeriod = Math.floor(periodDays / 2);
    const midPoint = subDays(new Date(), halfPeriod);

    const recentRecords = records.filter((r) => r.scheduledTime >= midPoint);
    const olderRecords = records.filter(
      (r) =>
        r.scheduledTime < midPoint &&
        r.scheduledTime >= subDays(new Date(), periodDays),
    );

    if (recentRecords.length === 0 || olderRecords.length === 0) {
      return "STABLE";
    }

    const recentScore = RegimenComplianceService.calculateComplianceScore(
      recentRecords,
      halfPeriod,
    ).overall;
    const olderScore = RegimenComplianceService.calculateComplianceScore(
      olderRecords,
      halfPeriod,
    ).overall;

    const difference = recentScore - olderScore;

    if (difference > 10) return "IMPROVING";
    if (difference < -10) return "DECLINING";
    return "STABLE";
  }

  private static generateRecommendations(
    adherenceRate: number,
    averageDelay: number,
    missedDoses: number,
    records: ComplianceRecord[],
  ): string[] {
    const recommendations: string[] = [];

    RegimenComplianceService.addAdherenceRecommendation(
      adherenceRate,
      recommendations,
    );
    RegimenComplianceService.addDelayRecommendation(
      averageDelay,
      recommendations,
    );
    RegimenComplianceService.addMissedDosesRecommendation(
      missedDoses,
      recommendations,
    );
    RegimenComplianceService.addMissedDosePatternRecommendation(
      records,
      recommendations,
    );

    if (recommendations.length === 0) {
      recommendations.push("Excellent adherence! Continue current routine");
    }

    return recommendations;
  }

  private static addAdherenceRecommendation(
    adherenceRate: number,
    recommendations: string[],
  ): void {
    if (adherenceRate < 80) {
      recommendations.push(
        "Consider simplifying dosing schedule or using reminder systems",
      );
    }
  }

  private static addDelayRecommendation(
    averageDelay: number,
    recommendations: string[],
  ): void {
    if (averageDelay > 60) {
      recommendations.push(
        "Review timing of doses to better fit daily routine",
      );
    }
  }

  private static addMissedDosesRecommendation(
    missedDoses: number,
    recommendations: string[],
  ): void {
    if (missedDoses > 3) {
      recommendations.push(
        "Identify and address barriers to medication administration",
      );
    }
  }

  private static addMissedDosePatternRecommendation(
    records: ComplianceRecord[],
    recommendations: string[],
  ): void {
    const missedByDay = new Map<string, number>();
    records
      .filter((r) => r.status === "MISSED")
      .forEach((record) => {
        const day = format(record.scheduledTime, "EEEE");
        missedByDay.set(day, (missedByDay.get(day) || 0) + 1);
      });

    if (missedByDay.size === 0) return;

    const maxMissedDay = Array.from(missedByDay.entries()).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (maxMissedDay && maxMissedDay[1] > 2) {
      recommendations.push(
        `Most doses missed on ${maxMissedDay[0]} - consider schedule adjustment`,
      );
    }
  }
}
