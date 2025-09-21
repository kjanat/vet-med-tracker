// Shared inventory types
export interface InventorySource {
  id: string;
  name: string;
  brandName?: string;
  lot: string;
  expiresOn: Date | null;
  unitsRemaining: number;
  isExpired: boolean;
  isWrongMed: boolean;
  inUse: boolean;
}
