export function adminKey(animalId: string, regimenId: string, localDayISO: string, slotIndex?: number) {
  return slotIndex != null
    ? `${animalId}:${regimenId}:${localDayISO}:${slotIndex}`
    : `${animalId}:${regimenId}:${localDayISO}:prn:${crypto.randomUUID()}`
}
