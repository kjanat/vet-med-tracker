/**
 * Emergency Quick-Dial Service
 * Provides quick access to emergency contacts and veterinarian information
 * for medical emergencies with mobile-optimized dialing
 */

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  isPrimary: boolean;
}

export interface VeterinarianContact {
  name: string;
  phone: string | null | undefined;
  clinic?: string;
}

export class EmergencyDialService {
  /**
   * Initiate a phone call to emergency contact
   * Uses tel: protocol for mobile device compatibility
   */
  static dialEmergencyContact(contact: EmergencyContact): void {
    if (!contact.phone) {
      console.warn("No phone number available for contact:", contact.name);
      return;
    }

    const cleanPhone = EmergencyDialService.cleanPhoneNumber(contact.phone);
    const telUri = `tel:${cleanPhone}`;

    // Track emergency dial for audit purposes
    EmergencyDialService.logEmergencyDial(contact.name, cleanPhone);

    // Initiate call
    window.location.href = telUri;
  }

  /**
   * Initiate a phone call to veterinarian
   */
  static dialVeterinarian(vet: VeterinarianContact): void {
    if (!vet.phone) {
      console.warn("No phone number available for veterinarian:", vet.name);
      return;
    }

    const cleanPhone = EmergencyDialService.cleanPhoneNumber(vet.phone);
    const telUri = `tel:${cleanPhone}`;

    // Track veterinarian dial for audit purposes
    EmergencyDialService.logVeterinarianDial(vet.name, cleanPhone);

    // Initiate call
    window.location.href = telUri;
  }

  /**
   * Clean phone number for tel: protocol
   * Removes spaces, dashes, parentheses, and other formatting
   */
  private static cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, "");
  }

  /**
   * Log emergency contact dial for audit trail
   */
  private static async logEmergencyDial(
    contactName: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      await fetch("/api/audit/emergency-dial", {
        body: JSON.stringify({
          contactName,
          phoneNumber,
          timestamp: new Date().toISOString(),
          type: "emergency_contact",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to log emergency dial event:", error);
      // Don't throw - emergency calling should not be blocked by logging failures
    }
  }

  /**
   * Log veterinarian dial for audit trail
   */
  private static async logVeterinarianDial(
    vetName: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      await fetch("/api/audit/emergency-dial", {
        body: JSON.stringify({
          contactName: vetName,
          phoneNumber,
          timestamp: new Date().toISOString(),
          type: "veterinarian",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to log veterinarian dial event:", error);
      // Don't throw - emergency calling should not be blocked by logging failures
    }
  }

  /**
   * Format phone number for display
   * Converts to (XXX) XXX-XXXX format for US numbers
   */
  static formatPhoneForDisplay(phone: string): string {
    const cleaned = EmergencyDialService.cleanPhoneNumber(phone);

    // Handle US phone numbers (10 or 11 digits)
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");
    }

    // Return original if not standard US format
    return phone;
  }

  /**
   * Check if device supports tel: protocol
   */
  static canMakePhoneCalls(): boolean {
    // Check if running on mobile device or desktop with phone capability
    return (
      typeof window !== "undefined" &&
      (navigator.userAgent.includes("Mobile") ||
        navigator.userAgent.includes("Android") ||
        navigator.userAgent.includes("iPhone"))
    );
  }

  /**
   * Get emergency action for non-phone capable devices
   */
  static getEmergencyFallback(phone: string): string {
    return `Call ${EmergencyDialService.formatPhoneForDisplay(phone)} immediately`;
  }
}
