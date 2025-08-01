// Shared inventory types
export interface InventorySource {
	id: string;
	name: string;
	brand?: string;
	lot: string;
	expiresOn: Date | null;
	unitsRemaining: number;
	isExpired: boolean;
	isWrongMed: boolean;
	inUse: boolean;
}
