// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { addHours, subDays, subHours } from "date-fns";
import {
  type ComplianceRecord,
  RegimenComplianceService,
} from "@/lib/services/regimen-compliance.service";

describe("RegimenComplianceService", () => {
  const createMockRecord = (
    overrides: Partial<ComplianceRecord> = {},
  ): ComplianceRecord => ({
    animalId: "test-animal",
    regimenId: "test-regimen",
    scheduledTime: new Date(),
    status: "GIVEN",
    ...overrides,
  });

  describe("calculateComplianceScore", () => {
    it("should calculate perfect compliance score", () => {
      const records: ComplianceRecord[] = [
        createMockRecord({
          actualTime: subDays(new Date(), 1),
          scheduledTime: subDays(new Date(), 1),
          status: "GIVEN",
        }),
        createMockRecord({
          actualTime: subDays(new Date(), 2),
          scheduledTime: subDays(new Date(), 2),
          status: "GIVEN",
        }),
      ];

      const score = RegimenComplianceService.calculateComplianceScore(
        records,
        7,
      );

      expect(score.overall).toBe(100);
      expect(score.adherenceScore).toBe(100);
      expect(score.timingScore).toBe(100);
      expect(score.trend).toBe("STABLE");
    });

    it("should calculate score with missed doses", () => {
      const records: ComplianceRecord[] = [
        createMockRecord({
          actualTime: subDays(new Date(), 1),
          scheduledTime: subDays(new Date(), 1),
          status: "GIVEN",
        }),
        createMockRecord({
          scheduledTime: subDays(new Date(), 2),
          status: "MISSED",
        }),
        createMockRecord({
          actualTime: subDays(new Date(), 3),
          scheduledTime: subDays(new Date(), 3),
          status: "GIVEN",
        }),
      ];

      const score = RegimenComplianceService.calculateComplianceScore(
        records,
        7,
      );

      expect(score.adherenceScore).toBe(67); // 2 out of 3 doses given
      expect(score.overall).toBeLessThan(100);
    });

    it("should calculate score with late doses", () => {
      const baseTime = subDays(new Date(), 1);
      const records: ComplianceRecord[] = [
        createMockRecord({
          actualTime: addHours(baseTime, 2), // 2 hours late
          scheduledTime: baseTime,
          status: "LATE",
        }),
      ];

      const score = RegimenComplianceService.calculateComplianceScore(
        records,
        7,
      );

      expect(score.adherenceScore).toBe(100); // Dose was given
      expect(score.timingScore).toBeLessThan(100); // But timing was poor
      expect(score.overall).toBeLessThan(100);
    });

    it("should handle empty records", () => {
      const score = RegimenComplianceService.calculateComplianceScore([], 7);

      expect(score.overall).toBe(0);
      expect(score.adherenceScore).toBe(0);
      expect(score.timingScore).toBe(0);
      expect(score.trend).toBe("STABLE");
    });

    it("should calculate improving trend", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        // Older period (poor compliance)
        createMockRecord({
          scheduledTime: subDays(now, 10),
          status: "MISSED",
        }),
        createMockRecord({
          scheduledTime: subDays(now, 9),
          status: "MISSED",
        }),
        // Recent period (good compliance)
        createMockRecord({
          actualTime: subDays(now, 2),
          scheduledTime: subDays(now, 2),
          status: "GIVEN",
        }),
        createMockRecord({
          actualTime: subDays(now, 1),
          scheduledTime: subDays(now, 1),
          status: "GIVEN",
        }),
      ];

      const score = RegimenComplianceService.calculateComplianceScore(
        records,
        14,
      );

      expect(score.trend).toBe("IMPROVING");
    });
  });

  describe("generateComplianceAlerts", () => {
    const mockRegimen = {
      animalName: "Buddy",
      highRisk: false,
      id: "test-regimen",
      medicationName: "Amoxicillin",
    };

    it("should generate missed dose alerts", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        createMockRecord({
          scheduledTime: subHours(now, 5), // 5 hours ago
          status: "PENDING",
        }),
      ];

      const alerts = RegimenComplianceService.generateComplianceAlerts(
        records,
        mockRegimen,
        240, // 4 hour cutoff
      );

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts.some((a) => a.type === "MISSED_DOSE")).toBe(true);
      expect(alerts[0].type).toBe("MISSED_DOSE");
      expect(alerts[0].severity).toBe("HIGH");
      expect(alerts[0].message).toContain("Missed dose");
    });

    it("should escalate severity for high-risk medications", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        createMockRecord({
          scheduledTime: subHours(now, 5),
          status: "PENDING",
        }),
      ];

      const highRiskRegimen = { ...mockRegimen, highRisk: true };
      const alerts = RegimenComplianceService.generateComplianceAlerts(
        records,
        highRiskRegimen,
        240,
      );

      expect(alerts[0].severity).toBe("CRITICAL");
    });

    it("should generate late dose alerts", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        createMockRecord({
          scheduledTime: subHours(now, 1), // 1 hour ago
          status: "PENDING",
        }),
      ];

      const alerts = RegimenComplianceService.generateComplianceAlerts(
        records,
        mockRegimen,
        240,
      );

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts.some((a) => a.type === "LATE_DOSE")).toBe(true);
      expect(alerts[0].type).toBe("LATE_DOSE");
      expect(alerts[0].severity).toBe("MEDIUM");
    });

    it("should generate poor adherence alerts", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        createMockRecord({
          scheduledTime: subDays(now, 1),
          status: "MISSED",
        }),
        createMockRecord({
          scheduledTime: subDays(now, 2),
          status: "MISSED",
        }),
        createMockRecord({
          scheduledTime: subDays(now, 3),
          status: "MISSED",
        }),
      ];

      const alerts = RegimenComplianceService.generateComplianceAlerts(
        records,
        mockRegimen,
      );

      expect(alerts.some((a) => a.type === "POOR_ADHERENCE")).toBe(true);
    });
  });

  describe("generateAdherenceReport", () => {
    it("should generate comprehensive report", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        createMockRecord({
          actualTime: subDays(now, 1),
          scheduledTime: subDays(now, 1),
          status: "GIVEN",
        }),
        createMockRecord({
          scheduledTime: subDays(now, 2),
          status: "MISSED",
        }),
        createMockRecord({
          actualTime: addHours(subDays(now, 3), 1),
          scheduledTime: subDays(now, 3),
          status: "LATE",
        }),
      ];

      const report = RegimenComplianceService.generateAdherenceReport(
        records,
        7,
      );

      expect(report.totalDoses).toBe(3);
      expect(report.givenDoses).toBe(1);
      expect(report.lateDoses).toBe(1);
      expect(report.missedDoses).toBe(1);
      expect(Math.round(report.adherenceRate)).toBe(67); // (1+1)/3 * 100
      expect(report.averageDelay).toBeGreaterThan(0);
      expect(report.trends.weekly).toHaveLength(4);
      expect(report.recommendations).toHaveLength(1);
    });

    it("should include helpful recommendations", () => {
      const now = new Date();
      const poorComplianceRecords: ComplianceRecord[] = Array.from(
        { length: 10 },
        (_, i) =>
          createMockRecord({
            scheduledTime: subDays(now, i + 1),
            status: i % 3 === 0 ? "GIVEN" : "MISSED", // ~33% adherence
          }),
      );

      const report = RegimenComplianceService.generateAdherenceReport(
        poorComplianceRecords,
        30,
      );

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(
        report.recommendations.some((r) =>
          r.includes("simplifying dosing schedule"),
        ),
      ).toBe(true);
    });
  });

  describe("calculateProgressMetrics", () => {
    it("should calculate streak metrics", () => {
      const now = new Date();
      const records: ComplianceRecord[] = [
        // Perfect week (current streak)
        createMockRecord({
          actualTime: subDays(now, 1),
          scheduledTime: subDays(now, 1),
          status: "GIVEN",
        }),
        createMockRecord({
          actualTime: subDays(now, 2),
          scheduledTime: subDays(now, 2),
          status: "GIVEN",
        }),
        createMockRecord({
          actualTime: subDays(now, 3),
          scheduledTime: subDays(now, 3),
          status: "GIVEN",
        }),
        // Break in streak
        createMockRecord({
          scheduledTime: subDays(now, 4),
          status: "MISSED",
        }),
        // Another good day
        createMockRecord({
          actualTime: subDays(now, 5),
          scheduledTime: subDays(now, 5),
          status: "GIVEN",
        }),
      ];

      const metrics =
        RegimenComplianceService.calculateProgressMetrics(records);

      expect(metrics.currentStreak).toBeGreaterThan(0);
      expect(metrics.longestStreak).toBeGreaterThan(0);
      expect(metrics.totalDaysActive).toBeGreaterThan(0);
      expect(Object.keys(metrics.missedDosesByDay)).toHaveLength(7); // Days of week
      expect(Object.keys(metrics.timeDistribution)).toHaveLength(4); // Time periods
    });

    it("should handle empty records", () => {
      const metrics = RegimenComplianceService.calculateProgressMetrics([]);

      expect(metrics.currentStreak).toBe(0);
      expect(metrics.longestStreak).toBe(0);
      expect(metrics.totalDaysActive).toBe(0);
    });
  });

  describe("recordDoseAdministration", () => {
    it("should record on-time dose", () => {
      const scheduledTime = new Date();
      const actualTime = addHours(scheduledTime, 0.25); // 15 minutes later

      const record = RegimenComplianceService.recordDoseAdministration(
        "regimen-123",
        "animal-456",
        scheduledTime,
        actualTime,
        "Owner",
        "Given with food",
        "100mg",
      );

      expect(record.status).toBe("GIVEN");
      expect(record.regimenId).toBe("regimen-123");
      expect(record.administeredBy).toBe("Owner");
      expect(record.notes).toBe("Given with food");
      expect(record.dosage).toBe("100mg");
    });

    it("should record late dose", () => {
      const scheduledTime = new Date();
      const actualTime = addHours(scheduledTime, 2); // 2 hours later

      const record = RegimenComplianceService.recordDoseAdministration(
        "regimen-123",
        "animal-456",
        scheduledTime,
        actualTime,
        "Owner",
      );

      expect(record.status).toBe("LATE");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle malformed date objects gracefully", () => {
      const records: ComplianceRecord[] = [
        createMockRecord({
          scheduledTime: new Date("invalid-date"),
          status: "GIVEN",
        }),
      ];

      // Should not throw error
      expect(() => {
        RegimenComplianceService.calculateComplianceScore(records, 7);
      }).not.toThrow();
    });

    it("should handle very large datasets efficiently", () => {
      const largeRecordSet: ComplianceRecord[] = Array.from(
        { length: 1000 },
        (_, i) =>
          createMockRecord({
            scheduledTime: subDays(new Date(), i),
            status: i % 4 === 0 ? "MISSED" : "GIVEN",
          }),
      );

      const startTime = Date.now();
      const score = RegimenComplianceService.calculateComplianceScore(
        largeRecordSet,
        365,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(score.overall).toBeGreaterThan(0);
    });
  });
});
