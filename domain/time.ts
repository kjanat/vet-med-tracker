// domain/time.ts
// NOTE: If you can, prefer Temporal. If not, keep this small and tested.
export function toAnimalLocal(
  administeredAt: Date,
  tz: string,
): { local: Date; minutes: number } {
  const local = new Date(
    administeredAt.toLocaleString("en-US", { timeZone: tz }),
  );
  return { local, minutes: local.getHours() * 60 + local.getMinutes() };
}

export function closestScheduled(
  adminMinutes: number,
  timesLocal: string[] | null | undefined,
): { time: string; minutes: number } | null {
  if (!timesLocal?.length) return null;
  let best: { time: string; minutes: number } | null = null;
  let min = Infinity;
  for (const t of timesLocal) {
    const [h, m] = t.split(":").map(Number);
    const mins = (h || 0) * 60 + (m || 0);
    const diff = Math.abs(adminMinutes - mins);
    if (diff < min) {
      min = diff;
      best = { minutes: mins, time: t };
    }
  }
  return best;
}
