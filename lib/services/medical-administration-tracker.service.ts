/**
 * Medical Administration Tracker Service
 * Provides real-time tracking of medication administrations
 * Integrates with emergency protocols and compliance monitoring
 */

const cachedDays = 30;

export interface AdministrationEvent {
  id: string;
  animalId: string;
  animalName: string;
  regimenId: string;
  medicationName: string;
  dose: string;
  route: string;
  administeredAt: string;
  administeredBy: string;
  status: "completed" | "missed" | "delayed" | "pending";
  notes?: string;
  isHighRisk: boolean;
  requiresCoSign: boolean;
  coSignedBy?: string;
  coSignedAt?: string;
}

export interface AdministrationStats {
  totalToday: number;
  completedToday: number;
  missedToday: number;
  delayedToday: number;
  complianceRate: number;
  highRiskAdministrations: number;
  pendingCoSigns: number;
}

export interface EmergencyAlert {
  id: string;
  type: "missed_critical" | "high_risk_due" | "overdue" | "interaction_warning";
  severity: "critical" | "high" | "medium";
  animalId: string;
  animalName: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

class MedicalAdministrationTracker {
  private static listeners: Set<(event: AdministrationEvent) => void> =
    new Set();
  private static alertListeners: Set<(alert: EmergencyAlert) => void> =
    new Set();
  private static events: AdministrationEvent[] = [];

  /**
   * Subscribe to real-time administration events
   */
  static subscribe(callback: (event: AdministrationEvent) => void): () => void {
    MedicalAdministrationTracker.listeners.add(callback);
    return () => MedicalAdministrationTracker.listeners.delete(callback);
  }

  /**
   * Subscribe to emergency alerts
   */
  static subscribeToAlerts(
    callback: (alert: EmergencyAlert) => void,
  ): () => void {
    MedicalAdministrationTracker.alertListeners.add(callback);
    return () => MedicalAdministrationTracker.alertListeners.delete(callback);
  }

  /**
   * Record a new medication administration
   */
  static recordAdministration(
    administration: Omit<AdministrationEvent, "id" | "administeredAt">,
  ): void {
    const event: AdministrationEvent = {
      ...administration,
      administeredAt: new Date().toISOString(),
      id: MedicalAdministrationTracker.generateId(),
    };

    // Cache for session analytics
    MedicalAdministrationTracker.cacheAdministration(event);

    // Notify subscribers
    MedicalAdministrationTracker.notifyListeners(event);

    // Check for alerts
    MedicalAdministrationTracker.checkForAlerts(event);

    // Update compliance metrics
    MedicalAdministrationTracker.updateComplianceMetrics(event);
  }

  /**
   * Get today's administration statistics
   */
  static getTodayStats(animalId?: string): AdministrationStats {
    const today: string = new Date().toISOString().slice(0, 10);
    const administrations =
      MedicalAdministrationTracker.getCachedAdministrations(today);

    const filtered = animalId
      ? administrations.filter((a) => a.animalId === animalId)
      : administrations;

    const total = filtered.length;
    const completed = filtered.filter((a) => a.status === "completed").length;
    const missed = filtered.filter((a) => a.status === "missed").length;
    const delayed = filtered.filter((a) => a.status === "delayed").length;
    const highRisk = filtered.filter((a) => a.isHighRisk).length;
    const pendingCoSigns = filtered.filter(
      (a) => a.requiresCoSign && !a.coSignedBy,
    ).length;

    return {
      completedToday: completed,
      complianceRate: total > 0 ? (completed / total) * 100 : 100,
      delayedToday: delayed,
      highRiskAdministrations: highRisk,
      missedToday: missed,
      pendingCoSigns,
      totalToday: total,
    };
  }

  /**
   * Get recent administrations for an animal
   */
  static getRecentAdministrations(
    animalId: string,
    hours: number = 24,
  ): AdministrationEvent[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allAdministrations =
      MedicalAdministrationTracker.getAllCachedAdministrations();

    return allAdministrations
      .filter((a) => a.animalId === animalId)
      .filter((a) => new Date(a.administeredAt) > cutoff)
      .sort(
        (a, b) =>
          new Date(b.administeredAt).getTime() -
          new Date(a.administeredAt).getTime(),
      );
  }

  /**
   * Calculate compliance trends over time
   */
  static getComplianceTrend(
    animalId: string,
    days: number = 7,
  ): Array<{
    date: string;
    complianceRate: number;
    totalAdministrations: number;
  }> {
    const trend: Array<{
      date: string;
      complianceRate: number;
      totalAdministrations: number;
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr: string = date.toISOString().slice(0, 10);

      const administrations =
        MedicalAdministrationTracker.getCachedAdministrations(dateStr).filter(
          (a) => a.animalId === animalId,
        );

      const total = administrations.length;
      const completed = administrations.filter(
        (a) => a.status === "completed",
      ).length;
      const complianceRate = total > 0 ? (completed / total) * 100 : 100;

      trend.push({
        complianceRate,
        date: dateStr,
        totalAdministrations: total,
      });
    }

    return trend;
  }

  /**
   * Get emergency contact recommendations based on current status
   */
  static getEmergencyRecommendations(animalId: string): Array<{
    priority: "immediate" | "urgent" | "monitor";
    message: string;
    action: string;
  }> {
    const recentAdministrations =
      MedicalAdministrationTracker.getRecentAdministrations(animalId, 24);
    const stats = MedicalAdministrationTracker.getTodayStats(animalId);
    const recommendations: Array<{
      priority: "immediate" | "urgent" | "monitor";
      message: string;
      action: string;
    }> = [];

    // Check for missed high-risk medications
    const missedHighRisk = recentAdministrations.filter(
      (a) => a.status === "missed" && a.isHighRisk,
    );
    if (missedHighRisk.length > 0) {
      recommendations.push({
        action: "Contact veterinarian immediately",
        message: `${missedHighRisk.length} high-risk medication(s) missed in the last 24 hours`,
        priority: "immediate",
      });
    }

    // Check compliance rate
    if (stats.complianceRate < 70) {
      recommendations.push({
        action: "Review medication schedule and barriers to administration",
        message: `Low compliance rate: ${stats.complianceRate.toFixed(1)}%`,
        priority: "urgent",
      });
    }

    // Check pending co-signs
    if (stats.pendingCoSigns > 0) {
      recommendations.push({
        action: "Follow up with authorized co-signers",
        message: `${stats.pendingCoSigns} administration(s) awaiting co-signature`,
        priority: "monitor",
      });
    }

    return recommendations;
  }

  /**
   * Clear old cached data (call periodically)
   */
  static clearOldCache(): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cachedDays);

      const daysInYear = 365;
      for (let i = 0; i < daysInYear; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        if (date < cutoffDate) {
          const dateStr = date.toISOString().slice(0, 10);
          localStorage.removeItem(`vetmed_administrations_${dateStr}`);
        }
      }
    } catch (error) {
      console.warn("Failed to clear old cache:", error);
    }
  }

  /**
   * Check for emergency alerts based on administration patterns
   */
  private static checkForAlerts(administration: AdministrationEvent): void {
    const alerts: EmergencyAlert[] = [];

    // High-risk medication alert
    if (administration.isHighRisk && administration.status === "completed") {
      alerts.push({
        acknowledged: false,
        animalId: administration.animalId,
        animalName: administration.animalName,
        createdAt: new Date(),
        id: MedicalAdministrationTracker.generateId(),
        message: `High-risk medication ${administration.medicationName} administered to ${administration.animalName}. Monitor closely.`,
        severity: "high",
        type: "high_risk_due",
      });
    }

    // Missed critical medication
    if (administration.status === "missed" && administration.isHighRisk) {
      alerts.push({
        acknowledged: false,
        animalId: administration.animalId,
        animalName: administration.animalName,
        createdAt: new Date(),
        id: MedicalAdministrationTracker.generateId(),
        message: `CRITICAL: High-risk medication ${administration.medicationName} missed for ${administration.animalName}. Contact veterinarian immediately.`,
        severity: "critical",
        type: "missed_critical",
      });
    }

    // Notify alert subscribers
    alerts.forEach((alert) => {
      MedicalAdministrationTracker.notifyAlertListeners(alert);
    });
  }

  /**
   * Cache administration events for session analytics
   */
  private static cacheAdministration(
    administration: AdministrationEvent,
  ): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cachedDays);

    MedicalAdministrationTracker.events = MedicalAdministrationTracker.events
      .filter((event) => new Date(event.administeredAt) >= cutoff)
      .concat(administration);
  }

  /**
   * Get cached administrations for a specific date
   */
  private static getCachedAdministrations(date: string): AdministrationEvent[] {
    return MedicalAdministrationTracker.events.filter((event) =>
      event.administeredAt.startsWith(date),
    );
  }

  /**
   * Get all cached administrations
   */
  private static getAllCachedAdministrations(): AdministrationEvent[] {
    return [...MedicalAdministrationTracker.events];
  }

  /**
   * Update compliance metrics
   */
  private static updateComplianceMetrics(
    administration: AdministrationEvent,
  ): void {
    // In a real implementation, this would update persistent metrics
    // For now, we'll just log for debugging
    console.log(
      `Compliance updated for ${administration.animalName}: ${administration.status}`,
    );
  }

  /**
   * Notify event listeners
   */
  private static notifyListeners(event: AdministrationEvent): void {
    MedicalAdministrationTracker.listeners.forEach(
      (callback: (event: AdministrationEvent) => void): void => {
        try {
          callback(event);
        } catch (error) {
          console.error("Error in administration event listener:", error);
        }
      },
    );
  }

  /**
   * Notify alert listeners
   */
  private static notifyAlertListeners(alert: EmergencyAlert): void {
    MedicalAdministrationTracker.alertListeners.forEach(
      (callback: (alert: EmergencyAlert) => void): void => {
        try {
          callback(alert);
        } catch (error) {
          console.error("Error in alert listener:", error);
        }
      },
    );
  }

  /**
   * Generate unique ID
   */
  private static generateId(): string {
    const encodingBase = 36;
    return `${Date.now()}-${Math.random().toString(encodingBase).substring(2, 9)}`;
  }
}

export default MedicalAdministrationTracker;
