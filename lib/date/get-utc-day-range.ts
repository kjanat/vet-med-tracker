export type UtcDayRange = {
  start: Date;
  endExclusive: Date;
};

export const getUtcDayRange = (date: Date): UtcDayRange => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { endExclusive, start };
};
