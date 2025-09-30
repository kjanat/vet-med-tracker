export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isVeterinarian?: boolean;
}

export class EmergencyDialService {
  static async getEmergencyContacts(): Promise<EmergencyContact[]> {
    // Mock implementation - would fetch from database in real app
    return [
      {
        id: "1",
        isVeterinarian: true,
        name: "Dr. Smith - Veterinary Clinic",
        phone: "(555) 123-4567",
        relationship: "Primary Veterinarian",
      },
      {
        id: "2",
        isVeterinarian: true,
        name: "Emergency Animal Hospital",
        phone: "(555) 999-8888",
        relationship: "Emergency Vet",
      },
    ];
  }

  static formatPhoneForDialing(phone: string): string {
    // Remove formatting and return clean phone number
    return phone.replace(/[^\d]/g, "");
  }

  static formatPhoneForDisplay(phone: string): string {
    // Format phone number for display (e.g., "+1 (555) 123-4567")
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === "1") {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone; // Return as-is if format not recognized
  }

  static async dialVeterinarian(phone: string): Promise<void> {
    const cleanPhone = EmergencyDialService.formatPhoneForDialing(phone);
    if (EmergencyDialService.canMakePhoneCalls()) {
      window.location.href = `tel:${cleanPhone}`;
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(cleanPhone);
    }
  }

  static async dialEmergencyContact(phone: string): Promise<void> {
    const cleanPhone = EmergencyDialService.formatPhoneForDialing(phone);
    if (EmergencyDialService.canMakePhoneCalls()) {
      window.location.href = `tel:${cleanPhone}`;
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(cleanPhone);
    }
  }

  static canMakePhoneCalls(): boolean {
    // Check if device can make phone calls
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  static initiateCall(phone: string): void {
    const cleanPhone = EmergencyDialService.formatPhoneForDialing(phone);
    // In a real app, this would integrate with device calling functionality
    console.log(`Initiating call to: ${cleanPhone}`);

    // For web, we can create a tel: link
    if (typeof window !== "undefined") {
      window.location.href = `tel:${cleanPhone}`;
    }
  }
}
