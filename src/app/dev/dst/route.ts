import { DateTime } from "luxon";
import { NextResponse } from "next/server";

// Mock database operations for DST testing
async function createTestData() {
  const tz = "Europe/Amsterdam";

  // Simulate creating test household and animal
  const household = {
    id: "dst-test-household",
    name: "DST Test Household",
    timezone: tz,
  };

  const animal = {
    householdId: household.id,
    id: "dst-test-animal",
    name: "DST Hound",
    species: "dog",
    timezone: tz,
  };

  const medication = {
    form: "tablet",
    genericName: "Amoxicillin",
    id: "dst-test-med",
    route: "ORAL",
    strength: "250 mg",
  };

  const regimen = {
    active: true,
    animalId: animal.id,
    cutoffMins: 240, // 4 hours
    highRisk: false,
    id: "dst-test-regimen",
    medicationId: medication.id,
    scheduleType: "FIXED",
    timesLocal: ["08:00", "18:00"],
  };

  return { animal, household, medication, regimen };
}

function expandFixedTimes(
  times: string[],
  dateISO: string,
  timezone: string,
): Date[] {
  const slots: Date[] = [];

  for (const timeLocal of times) {
    const dt = DateTime.fromISO(`${dateISO}T${timeLocal}:00`, {
      zone: timezone,
    });
    slots.push(dt.toJSDate());
  }

  return slots;
}

export async function GET() {
  try {
    const tz = "Europe/Amsterdam";

    // Choose a range straddling the last DST transition (Oct 2024)
    const start = DateTime.fromISO("2024-10-26", { zone: tz }); // Saturday before DST ends
    const end = start.plus({ days: 4 }); // Through Tuesday after

    const testData = await createTestData();
    const slots: Array<{
      date: string;
      timeLocal: string;
      timeUTC: string;
      targetUTC: Date;
      cutoffUTC: Date;
    }> = [];

    // Expand slots across DST transition
    for (let d = start; d <= end; d = d.plus({ days: 1 })) {
      const dateStr = d.toISODate();
      if (!dateStr) continue;
      const slotsUTC = expandFixedTimes(["08:00", "18:00"], dateStr, tz);

      for (const targetUTC of slotsUTC) {
        const targetLocal = DateTime.fromJSDate(targetUTC, { zone: tz });
        const cutoffUTC = new Date(targetUTC.getTime() + 240 * 60 * 1000); // +4 hours

        slots.push({
          cutoffUTC,
          date: dateStr,
          targetUTC,
          timeLocal: targetLocal.toFormat("HH:mm"),
          timeUTC: targetUTC.toISOString(),
        });

        // In real implementation, create administration records here
        console.log(
          `DST Test Slot: ${d.toISODate()} ${targetLocal.toFormat("HH:mm")} local = ${targetUTC.toISOString()} UTC`,
        );
      }
    }

    // Verify DST transition behavior
    const dstTransition = DateTime.fromISO("2024-10-27T02:00", { zone: tz });
    const beforeDST = slots.filter(
      (s) => DateTime.fromISO(s.timeUTC) < dstTransition,
    );
    const afterDST = slots.filter(
      (s) => DateTime.fromISO(s.timeUTC) >= dstTransition,
    );

    return NextResponse.json({
      afterDST: afterDST.length,
      beforeDST: beforeDST.length,
      dstTransition: dstTransition.toISO(),
      ok: true,
      range: {
        from: start.toISODate(),
        to: end.toISODate(),
      },
      sampleSlots: slots.slice(0, 8), // Show first 8 for inspection
      slots: slots.length,
      testData,
      timezone: tz,
      verification: {
        cutoffNote: "MISSED rows would appear at target + 240min local time",
        expectedBehavior: "Times should remain consistent in local timezone",
        message: "Verify slots align to 08:00/18:00 local across DST",
      },
    });
  } catch (error) {
    console.error("DST test error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
