export function adminKey(
  animalId: string,
  regimenId: string,
  localDayISO: string,
  slotIndex?: number,
) {
  return typeof slotIndex === "number"
    ? `${animalId}:${regimenId}:${localDayISO}:${slotIndex}`
    : `${animalId}:${regimenId}:${localDayISO}:prn:${crypto.randomUUID()}`;
}
