// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { addDays } from "date-fns";
import { RegimenDisplayService } from "@/lib/services/regimen-display.service";

describe("RegimenDisplayService", () => {
  describe("generateStatusBadges", () => {
    it("should generate basic badges for fixed schedule regimen", () => {
      const badges = RegimenDisplayService.generateStatusBadges({
        highRisk: false,
        scheduleType: "FIXED",
        status: "active",
      });

      expect(badges).toHaveLength(1);
      expect(badges[0].text).toBe("FIXED");
      expect(badges[0].variant).toBe("default");
      expect(badges[0].tooltip).toContain("specific times");
    });

    it("should generate badges for high-risk medication", () => {
      const badges = RegimenDisplayService.generateStatusBadges({
        highRisk: true,
        scheduleType: "PRN",
        status: "active",
      });

      expect(badges.some((b) => b.text === "High-risk")).toBe(true);
      expect(badges.find((b) => b.text === "High-risk")?.variant).toBe(
        "destructive",
      );
      expect(badges.find((b) => b.text === "High-risk")?.icon).toBe(
        "AlertTriangle",
      );
    });

    it("should generate status badges for paused regimen", () => {
      const badges = RegimenDisplayService.generateStatusBadges({
        highRisk: false,
        scheduleType: "FIXED",
        status: "paused",
      });

      expect(badges.some((b) => b.text === "Paused")).toBe(true);
      expect(badges.find((b) => b.text === "Paused")?.variant).toBe("outline");
    });

    it("should generate adherence badges with appropriate variants", () => {
      const badges = RegimenDisplayService.generateStatusBadges({
        adherenceRate: 95,
        highRisk: false,
        scheduleType: "FIXED",
        status: "active",
      });

      const adherenceBadge = badges.find((b) => b.text.includes("adherence"));
      expect(adherenceBadge).toBeTruthy();
      expect(adherenceBadge?.text).toBe("95% adherence");
      expect(adherenceBadge?.variant).toBe("default"); // Good adherence
    });

    it("should show poor adherence with destructive variant", () => {
      const badges = RegimenDisplayService.generateStatusBadges({
        adherenceRate: 45,
        highRisk: false,
        scheduleType: "FIXED",
        status: "active",
      });

      const adherenceBadge = badges.find((b) => b.text.includes("adherence"));
      expect(adherenceBadge?.variant).toBe("destructive");
    });
  });

  describe("createScheduleVisualization", () => {
    it("should create visualization for daily schedule", () => {
      const scheduleTimes = ["09:00", "21:00"];
      const timezone = "UTC";

      const viz = RegimenDisplayService.createScheduleVisualization(
        scheduleTimes,
        timezone,
      );

      expect(viz.timeSlots).toHaveLength(2);
      expect(viz.timeSlots[0].time).toBe("09:00");
      expect(viz.timeSlots[0].label).toBe("9:00 AM");
      expect(viz.timeSlots[1].time).toBe("21:00");
      expect(viz.timeSlots[1].label).toBe("9:00 PM");
    });

    it("should mark completed administrations", () => {
      const scheduleTimes = ["09:00"];
      const lastAdministrations = [
        {
          actualTime: new Date(),
          scheduledTime: new Date(),
          status: "GIVEN",
        },
      ];

      // Set the scheduled time to 9 AM today
      lastAdministrations[0].scheduledTime.setHours(9, 0, 0, 0);
      lastAdministrations[0].actualTime.setHours(9, 15, 0, 0); // 15 min late

      const viz = RegimenDisplayService.createScheduleVisualization(
        scheduleTimes,
        "UTC",
        lastAdministrations,
      );

      expect(viz.timeSlots[0].status).toBe("completed");
      expect(viz.timeSlots[0].delay).toBe(15); // 15 minutes
    });

    it("should identify missed doses", () => {
      const scheduleTimes = ["09:00"];
      const lastAdministrations = [
        {
          scheduledTime: new Date(),
          status: "MISSED",
        },
      ];

      lastAdministrations[0].scheduledTime.setHours(9, 0, 0, 0);

      const viz = RegimenDisplayService.createScheduleVisualization(
        scheduleTimes,
        "UTC",
        lastAdministrations,
      );

      expect(viz.timeSlots[0].status).toBe("missed");
    });

    it("should calculate next dose correctly", () => {
      const now = new Date();
      const futureHour = (now.getHours() + 2) % 24;
      const scheduleTimes = [`${futureHour.toString().padStart(2, "0")}:00`];

      const viz = RegimenDisplayService.createScheduleVisualization(
        scheduleTimes,
        "UTC",
      );

      expect(viz.nextDose).toBeTruthy();
      expect(viz.nextDose?.isLate).toBe(false);
    });
  });

  describe("createProgressIndicator", () => {
    it("should create excellent progress indicator", () => {
      const progress = RegimenDisplayService.createProgressIndicator(
        95,
        "STABLE",
      );

      expect(progress.percentage).toBe(95);
      expect(progress.color).toBe("green");
      expect(progress.label).toBe("Excellent");
      expect(progress.trend).toBe("stable");
    });

    it("should create poor progress indicator", () => {
      const progress = RegimenDisplayService.createProgressIndicator(
        45,
        "DECLINING",
      );

      expect(progress.percentage).toBe(45);
      expect(progress.color).toBe("red");
      expect(progress.label).toBe("Poor adherence");
      expect(progress.trend).toBe("down");
    });

    it("should create improving progress indicator", () => {
      const progress = RegimenDisplayService.createProgressIndicator(
        78,
        "IMPROVING",
      );

      expect(progress.color).toBe("blue"); // Good range
      expect(progress.trend).toBe("up");
    });
  });

  describe("formatRegimenForDisplay", () => {
    const mockRegimen = {
      animalName: "Buddy",
      cutoffMins: 240,
      endDate: addDays(new Date(), 10),
      form: "TABLET",
      highRisk: false,
      id: "regimen-123",
      isActive: true,
      medicationName: "Amoxicillin",
      route: "ORAL",
      scheduleType: "FIXED",
      startDate: new Date(),
      status: "active" as const,
      strength: "250mg",
      timesLocal: ["09:00", "21:00"],
    };

    it("should format regimen with all details", () => {
      const formatted =
        RegimenDisplayService.formatRegimenForDisplay(mockRegimen);

      expect(formatted.id).toBe("regimen-123");
      expect(formatted.title).toBe("Amoxicillin");
      expect(formatted.subtitle).toBe("250mg TABLET • ORAL");
      expect(formatted.badges).toHaveLength(1); // Schedule type badge
      expect(formatted.schedule.timeSlots).toHaveLength(2);
      expect(formatted.metadata.cutoffTime).toBe("240 minutes");
      expect(formatted.actions.canEdit).toBe(true);
      expect(formatted.actions.canPause).toBe(true);
      expect(formatted.actions.canArchive).toBe(true);
    });

    it("should format regimen with adherence data", () => {
      const adherenceData = {
        lastAdministrations: [],
        rate: 85,
        trend: "IMPROVING" as const,
      };

      const formatted = RegimenDisplayService.formatRegimenForDisplay(
        mockRegimen,
        adherenceData,
      );

      expect(formatted.badges.some((b) => b.text.includes("adherence"))).toBe(
        true,
      );
      expect(formatted.progress.percentage).toBe(85);
      expect(formatted.progress.trend).toBe("up");
    });

    it("should disable actions for ended regimen", () => {
      const endedRegimen = {
        ...mockRegimen,
        isActive: false,
        status: "ended" as const,
      };

      const formatted =
        RegimenDisplayService.formatRegimenForDisplay(endedRegimen);

      expect(formatted.actions.canEdit).toBe(false);
      expect(formatted.actions.canPause).toBe(false);
      expect(formatted.actions.canArchive).toBe(true); // Can still archive
    });
  });

  describe("calculateResponsiveLayout", () => {
    it("should calculate mobile layout", () => {
      const layout = RegimenDisplayService.calculateResponsiveLayout(
        600, // Mobile width
        3, // 3 regimens
        "standard",
      );

      expect(layout.isMobile).toBe(true);
      expect(layout.columns).toBe(1);
      expect(layout.cardSize).toBe("medium");
      expect(layout.compactMode).toBe(false);
    });

    it("should calculate desktop layout", () => {
      const layout = RegimenDisplayService.calculateResponsiveLayout(
        1200, // Desktop width
        8, // 8 regimens
        "detailed",
      );

      expect(layout.isMobile).toBe(false);
      expect(layout.columns).toBe(3); // More than 6 regimens
      expect(layout.cardSize).toBe("large");
      expect(layout.showDetails).toBe(true);
    });

    it("should enable compact mode for many regimens", () => {
      const layout = RegimenDisplayService.calculateResponsiveLayout(
        1200,
        15, // Many regimens
        "standard",
      );

      expect(layout.compactMode).toBe(true);
    });
  });

  describe("generateAdherenceChart", () => {
    it("should generate line chart data", () => {
      const data = [
        { adherence: 95, period: "Week 1" },
        { adherence: 80, period: "Week 2" },
        { adherence: 75, period: "Week 3" },
        { adherence: 90, period: "Week 4" },
      ];

      const chart = RegimenDisplayService.generateAdherenceChart(data, "line");

      expect(chart.type).toBe("line");
      expect(chart.data).toEqual([95, 80, 75, 90]);
      expect(chart.labels).toEqual(["Week 1", "Week 2", "Week 3", "Week 4"]);
      expect(chart.colors).toHaveLength(4);
      expect(chart.title).toBe("Medication Adherence Trend");
    });

    it("should use appropriate colors for adherence levels", () => {
      const data = [
        { adherence: 95, period: "Week 1" }, // Green (excellent)
        { adherence: 80, period: "Week 2" }, // Blue (good)
        { adherence: 65, period: "Week 3" }, // Yellow (needs improvement)
        { adherence: 45, period: "Week 4" }, // Red (poor)
      ];

      const chart = RegimenDisplayService.generateAdherenceChart(data);

      expect(chart.colors[0]).toBe("#10b981"); // Green
      expect(chart.colors[1]).toBe("#3b82f6"); // Blue
      expect(chart.colors[2]).toBe("#f59e0b"); // Yellow
      expect(chart.colors[3]).toBe("#ef4444"); // Red
    });
  });

  describe("formatTimeForDisplay", () => {
    it("should format time string in 12-hour format", () => {
      const formatted = RegimenDisplayService.formatTimeForDisplay(
        "14:30",
        undefined,
        true,
      );
      expect(formatted).toBe("2:30 PM");
    });

    it("should format time string in 24-hour format", () => {
      const formatted = RegimenDisplayService.formatTimeForDisplay(
        "14:30",
        undefined,
        false,
      );
      expect(formatted).toBe("14:30");
    });

    it("should format Date object", () => {
      const date = new Date();
      date.setHours(9, 15, 0, 0);

      const formatted = RegimenDisplayService.formatTimeForDisplay(
        date,
        undefined,
        true,
      );
      expect(formatted).toBe("9:15 AM");
    });
  });

  describe("createSummaryStats", () => {
    const mockRegimens = [
      {
        highRisk: true,
        id: "1",
        status: "active",
        timesLocal: ["09:00", "21:00"],
      },
      {
        highRisk: false,
        id: "2",
        status: "active",
        timesLocal: ["12:00"],
      },
      {
        highRisk: false,
        id: "3",
        status: "paused",
        timesLocal: ["08:00", "20:00"],
      },
    ];

    it("should calculate summary statistics", () => {
      const adherenceData = {
        "1": 90,
        "2": 85,
        "3": 70,
      };

      const stats = RegimenDisplayService.createSummaryStats(
        mockRegimens,
        adherenceData,
      );

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.highRisk).toBe(1);
      expect(stats.averageAdherence).toBe(82); // (90+85+70)/3 = 81.67 rounded
      expect(stats.upcomingDoses).toBeGreaterThan(0);
    });

    it("should handle empty regimens list", () => {
      const stats = RegimenDisplayService.createSummaryStats([]);

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.highRisk).toBe(0);
      expect(stats.averageAdherence).toBe(0);
      expect(stats.upcomingDoses).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle regimen without times", () => {
      const formatted = RegimenDisplayService.formatRegimenForDisplay({
        animalName: "Test",
        cutoffMins: 240,
        form: "TABLET",
        highRisk: false,
        id: "test",
        isActive: true,
        medicationName: "Test Med",
        route: "ORAL",
        scheduleType: "PRN",
        startDate: new Date(),
        status: "active",
      });

      expect(formatted.schedule.timeSlots).toHaveLength(0);
      expect(formatted.schedule.nextDose).toBeNull();
    });

    it("should handle missing strength and form gracefully", () => {
      const formatted = RegimenDisplayService.formatRegimenForDisplay({
        animalName: "Test",
        cutoffMins: 240,
        form: "TABLET",
        highRisk: false,
        id: "test",
        isActive: true,
        medicationName: "Test Med",
        route: "ORAL",
        scheduleType: "FIXED",
        startDate: new Date(),
        status: "active",
      });

      expect(formatted.subtitle).toBe("TABLET • ORAL");
    });
  });
});
