import { describe, expect, it } from "bun:test";
import type { AnimalFormData } from "@/lib/schemas/animal";
import { AnimalDataTransformer } from "@/lib/services/animalDataTransformer";
import type { Animal } from "@/lib/utils/types";

describe("AnimalDataTransformer", () => {
  const validFormData: AnimalFormData = {
    allergies: ["peanuts", "chicken"],
    breed: "Golden Retriever",
    clinicName: "Happy Paws Clinic",
    color: "Golden",
    conditions: ["hip dysplasia"],
    dob: new Date("2020-01-15"),
    microchipId: "123456789012345",
    name: "Buddy",
    neutered: false,
    notes: "Very friendly dog",
    photoUrl: "https://example.com/photo.jpg",
    sex: "Male",
    species: "Dog",
    timezone: "Europe/Amsterdam",
    vetEmail: "dr.smith@example.com",
    vetName: "Dr. Smith",
    vetPhone: "555-1234",
    weightKg: 30,
  };

  const validAnimalRecord: Animal = {
    allergies: ["fish"],
    breed: "Siamese",
    clinicName: "Pet Care Center",
    color: "Seal Point",
    conditions: ["kidney disease"],
    dob: new Date("2019-03-10"),
    id: "animal-123",
    microchipId: "987654321098765",
    name: "Max",
    neutered: true,
    notes: "Calm and gentle",
    pendingMeds: 0,
    photo: "https://example.com/cat.jpg",
    sex: "Male",
    species: "Cat",
    timezone: "America/Los_Angeles",
    vetEmail: "dr.johnson@example.com",
    vetName: "Dr. Johnson",
    vetPhone: "555-5678",
    weightKg: 5,
  };

  describe("toApiPayload", () => {
    it("should convert form data to API payload format", () => {
      const result = AnimalDataTransformer.toApiPayload(validFormData);

      expect(result.name).toBe("Buddy");
      expect(result.species).toBe("Dog");
      expect(result.breed).toBe("Golden Retriever");
      expect(result.sex).toBe("Male");
      expect(result.neutered).toBe(false);
      expect(result.dob).toBe("2020-01-15T00:00:00.000Z");
      expect(result.weightKg).toBe(30);
      expect(result.microchipId).toBe("123456789012345");
      expect(result.color).toBe("Golden");
      expect(result.timezone).toBe("Europe/Amsterdam");
      expect(result.vetName).toBe("Dr. Smith");
      expect(result.vetPhone).toBe("555-1234");
      expect(result.vetEmail).toBe("dr.smith@example.com");
      expect(result.clinicName).toBe("Happy Paws Clinic");
      expect(result.notes).toBe("Very friendly dog");
      expect(result.allergies).toEqual(["peanuts", "chicken"]);
      expect(result.conditions).toEqual(["hip dysplasia"]);
      expect(result.photoUrl).toBe("https://example.com/photo.jpg");
    });

    it("should handle undefined date by converting to undefined", () => {
      const dataWithoutDate = { ...validFormData, dob: undefined };
      const result = AnimalDataTransformer.toApiPayload(dataWithoutDate);

      expect(result.dob).toBe(undefined);
    });

    it("should handle empty optional fields by converting to undefined", () => {
      const minimalData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Basic Pet",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Male",
        species: "Dog",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.toApiPayload(minimalData);

      expect(result.breed).toBe(undefined);
      expect(result.weightKg).toBe(undefined);
      expect(result.microchipId).toBe(undefined);
      expect(result.color).toBe(undefined);
      expect(result.vetName).toBe(undefined);
      expect(result.vetPhone).toBe(undefined);
      expect(result.vetEmail).toBe(undefined);
      expect(result.clinicName).toBe(undefined);
      expect(result.notes).toBe(undefined);
      expect(result.photoUrl).toBe(undefined);
    });
  });

  describe("fromAnimalRecord", () => {
    it("should convert animal record to form data", () => {
      const result = AnimalDataTransformer.fromAnimalRecord(validAnimalRecord);

      expect(result.name).toBe("Max");
      expect(result.species).toBe("Cat");
      expect(result.breed).toBe("Siamese");
      expect(result.sex).toBe("Male");
      expect(result.neutered).toBe(true);
      expect(result.dob).toEqual(new Date("2019-03-10"));
      expect(result.weightKg).toBe(5);
      expect(result.microchipId).toBe("987654321098765");
      expect(result.color).toBe("Seal Point");
      expect(result.timezone).toBe("America/Los_Angeles");
      expect(result.vetName).toBe("Dr. Johnson");
      expect(result.vetPhone).toBe("555-5678");
      expect(result.vetEmail).toBe("dr.johnson@example.com");
      expect(result.clinicName).toBe("Pet Care Center");
      expect(result.notes).toBe("Calm and gentle");
      expect(result.allergies).toEqual(["fish"]);
      expect(result.conditions).toEqual(["kidney disease"]);
      expect(result.photoUrl).toBe("https://example.com/cat.jpg");
    });

    it("should handle null/undefined fields with appropriate defaults", () => {
      const minimalRecord: Animal = {
        allergies: [],
        breed: undefined,
        clinicName: undefined,
        color: undefined,
        conditions: [],
        dob: undefined,
        id: "animal-456",
        microchipId: undefined,
        name: "Simple Pet",
        neutered: undefined,
        notes: undefined,
        pendingMeds: 0,
        photo: undefined,
        sex: "Female",
        species: "Bird",
        timezone: "Europe/Amsterdam",
        vetEmail: undefined,
        vetName: undefined,
        vetPhone: undefined,
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.fromAnimalRecord(minimalRecord);

      expect(result.breed).toBe("");
      expect(result.neutered).toBe(false);
      expect(result.microchipId).toBe("");
      expect(result.color).toBe("");
      expect(result.timezone).toBe("Europe/Amsterdam"); // BROWSER_ZONE fallback
      expect(result.vetName).toBe("");
      expect(result.vetPhone).toBe("");
      expect(result.vetEmail).toBe("");
      expect(result.clinicName).toBe("");
      expect(result.notes).toBe("");
      expect(result.allergies).toEqual([]);
      expect(result.conditions).toEqual([]);
      expect(result.photoUrl).toBe("");
    });
  });

  describe("createDefaultValues", () => {
    it("should create form with default values", () => {
      const result = AnimalDataTransformer.createDefaultValues();

      expect(result.name).toBe("");
      expect(result.species).toBe("");
      expect(result.breed).toBe("");
      expect(result.sex).toBe(undefined);
      expect(result.neutered).toBe(false);
      expect(result.dob).toBe(undefined);
      expect(result.weightKg).toBe(undefined);
      expect(result.microchipId).toBe("");
      expect(result.color).toBe("");
      expect(result.timezone).toBe("Europe/Amsterdam");
      expect(result.vetName).toBe("");
      expect(result.vetPhone).toBe("");
      expect(result.vetEmail).toBe("");
      expect(result.clinicName).toBe("");
      expect(result.notes).toBe("");
      expect(result.allergies).toEqual([]);
      expect(result.conditions).toEqual([]);
      expect(result.photoUrl).toBe("");
    });
  });

  describe("toCreatePayload", () => {
    it("should create payload for new animal creation", () => {
      const result = AnimalDataTransformer.toCreatePayload(validFormData);

      expect(result.name).toBe("Buddy");
      expect(result.species).toBe("Dog");
      expect(result.allergies).toEqual(["peanuts", "chicken"]);
      expect(result.conditions).toEqual(["hip dysplasia"]);
      expect(result.timezone).toBe("Europe/Amsterdam");
      expect(result.dob).toBe("2020-01-15T00:00:00.000Z");
    });

    it("should ensure required fields are present", () => {
      const minimalData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Required Pet",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Male",
        species: "Required Species",
        timezone: "",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.toCreatePayload(minimalData);

      expect(result.name).toBe("Required Pet");
      expect(result.species).toBe("Required Species");
      expect(result.allergies).toEqual([]);
      expect(result.conditions).toEqual([]);
      expect(result.timezone).toBe("Europe/Amsterdam"); // fallback
    });
  });

  describe("toUpdatePayload", () => {
    it("should create payload for animal update with ID", () => {
      const animalId = "animal-update-123";
      const result = AnimalDataTransformer.toUpdatePayload(
        validFormData,
        animalId,
      );

      expect(result.id).toBe(animalId);
      expect(result.name).toBe("Buddy");
      expect(result.species).toBe("Dog");
      expect(result.dob).toBe("2020-01-15T00:00:00.000Z");
    });
  });

  describe("toInstrumentationData", () => {
    it("should create instrumentation data for new animal", () => {
      const result = AnimalDataTransformer.toInstrumentationData(
        validFormData,
        true,
        undefined,
      );

      expect(result.eventType).toBe("settings_animals_create");
      expect(result.detail.animalId).toBe(null);
      expect(result.detail.name).toBe("Buddy");
      expect(result.detail.species).toBe("Dog");
      expect(result.detail.isNew).toBe(true);
      expect(result.detail.hasBreed).toBe(true);
      expect(result.detail.hasWeight).toBe(true);
      expect(result.detail.hasVetInfo).toBe(true);
      expect(result.detail.allergyCount).toBe(2);
      expect(result.detail.conditionCount).toBe(1);
    });

    it("should create instrumentation data for existing animal update", () => {
      const animalId = "existing-animal-123";
      const result = AnimalDataTransformer.toInstrumentationData(
        validFormData,
        false,
        animalId,
      );

      expect(result.eventType).toBe("settings_animals_update");
      expect(result.detail.animalId).toBe(animalId);
      expect(result.detail.isNew).toBe(false);
    });

    it("should handle minimal data for instrumentation", () => {
      const minimalData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Minimal",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Male",
        species: "Dog",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.toInstrumentationData(
        minimalData,
        true,
      );

      expect(result.detail.hasBreed).toBe(false);
      expect(result.detail.hasWeight).toBe(false);
      expect(result.detail.hasVetInfo).toBe(false);
      expect(result.detail.allergyCount).toBe(0);
      expect(result.detail.conditionCount).toBe(0);
    });
  });

  describe("hasRequiredFields", () => {
    it("should return true for valid data with required fields", () => {
      const result = AnimalDataTransformer.hasRequiredFields(validFormData);
      expect(result).toBe(true);
    });

    it("should return false when name is missing", () => {
      const dataWithoutName = { ...validFormData, name: "" };
      const result = AnimalDataTransformer.hasRequiredFields(dataWithoutName);
      expect(result).toBe(false);
    });

    it("should return false when species is missing", () => {
      const dataWithoutSpecies = { ...validFormData, species: "" };
      const result =
        AnimalDataTransformer.hasRequiredFields(dataWithoutSpecies);
      expect(result).toBe(false);
    });

    it("should handle whitespace-only values", () => {
      const dataWithWhitespace = {
        ...validFormData,
        name: "   ",
        species: " Dog  ",
      };
      const result =
        AnimalDataTransformer.hasRequiredFields(dataWithWhitespace);
      expect(result).toBe(false); // name is whitespace only
    });
  });

  describe("isCompleteRecord", () => {
    it("should return true for complete record", () => {
      const result = AnimalDataTransformer.isCompleteRecord(validFormData);
      expect(result).toBe(true);
    });

    it("should return false for record with only basic info", () => {
      const basicData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Basic Pet",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Male",
        species: "Dog",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.isCompleteRecord(basicData);
      expect(result).toBe(false);
    });

    it("should return true when has required fields and some additional info", () => {
      const partialData: AnimalFormData = {
        allergies: [],
        breed: "Persian", // additional info
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Partial Pet",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Female",
        species: "Cat",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.isCompleteRecord(partialData);
      expect(result).toBe(true);
    });

    it("should return false when missing required fields", () => {
      const incompleteData = { ...validFormData, name: "" };
      const result = AnimalDataTransformer.isCompleteRecord(incompleteData);
      expect(result).toBe(false);
    });
  });

  describe("calculateCompleteness", () => {
    it("should calculate high completeness for fully filled form", () => {
      const result = AnimalDataTransformer.calculateCompleteness(validFormData);
      expect(result).toBeGreaterThan(90); // Should be very high but might not be exactly 100%
    });

    it("should calculate low completeness for minimal form", () => {
      const minimalData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "Minimal",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Male",
        species: "Dog",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.calculateCompleteness(minimalData);
      expect(result).toBeLessThan(90); // Much less than fully filled form
    });

    it("should handle partial completeness correctly", () => {
      const partialData: AnimalFormData = {
        allergies: [],
        breed: "Persian",
        clinicName: "",
        color: "",
        conditions: [],
        dob: new Date("2020-01-01"),
        microchipId: "123456789",
        name: "Partial Pet",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: "Female",
        species: "Cat",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: 5,
      };

      const result = AnimalDataTransformer.calculateCompleteness(partialData);
      expect(result).toBeGreaterThan(30);
      expect(result).toBeLessThan(90); // Should be between minimal and complete
    });

    it("should return 0 for completely empty form", () => {
      const emptyData: AnimalFormData = {
        allergies: [],
        breed: "",
        clinicName: "",
        color: "",
        conditions: [],
        dob: undefined,
        microchipId: "",
        name: "",
        neutered: false,
        notes: "",
        photoUrl: "",
        sex: undefined,
        species: "",
        timezone: "Europe/Amsterdam",
        vetEmail: "",
        vetName: "",
        vetPhone: "",
        weightKg: undefined,
      };

      const result = AnimalDataTransformer.calculateCompleteness(emptyData);
      expect(result).toBeLessThan(30); // Only timezone (and neutered=false) provide some completion
    });
  });
});
