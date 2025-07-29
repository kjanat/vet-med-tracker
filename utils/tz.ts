import { DateTime } from "luxon";

export const toAnimalLocal = (d: Date, tz: string) =>
	DateTime.fromJSDate(d).setZone(tz);

export const localDayISO = (d: Date, tz: string) => {
	const isoDate = toAnimalLocal(d, tz).toISODate();
	if (!isoDate) {
		throw new Error(`Failed to convert date to ISO format in timezone ${tz}`);
	}
	return isoDate;
};

// 08:00 -> Date for given local day
export function expandFixedTimes(times: string[], dayISO: string, tz: string) {
	return times.map((t) =>
		DateTime.fromISO(`${dayISO}T${t}`, { zone: tz }).toUTC().toJSDate(),
	);
}

export function formatTimeLocal(date: Date, tz: string) {
	return toAnimalLocal(date, tz).toFormat("h:mm a");
}
