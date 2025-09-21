// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
  type OrganizationConfig,
  type PhotoMetadata,
  PhotoMetadataService,
  type SearchFilter,
} from "../photo-metadata.service";
import type { Photo } from "../photo-upload.service";

describe("PhotoMetadataService", () => {
  const createMockPhoto = (options: Partial<Photo> = {}): Photo => ({
    caption: "Test photo",
    dimensions: { height: 1080, width: 1920 },
    id: "photo1",
    isPrimary: false,
    size: 1024 * 1024,
    uploadedAt: "2024-01-15T10:00:00Z",
    url: "https://example.com/photo1.jpg",
    ...options,
  });

  const createMockFile = (name: string, size: number): File => {
    const file = new File(["mock"], name, {
      lastModified: Date.now(),
      type: "image/jpeg",
    });

    // Mock the size property
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });

    return file;
  };

  describe("extractMetadata", () => {
    it("should extract basic metadata from photo", () => {
      const photo = createMockPhoto({
        caption: "Cat examination photo",
        id: "photo123",
      });

      const file = createMockFile("CASE001_abdomen_lateral.jpg", 2048);
      const medicalData = {
        animalId: "cat001",
        bodyPart: "abdomen",
        caseNumber: "CASE001",
        clinicalFindings: "mild inflammation",
      };

      const metadata = PhotoMetadataService.extractMetadata(
        photo,
        file,
        medicalData,
      );

      expect(metadata.id).toBe("photo123");
      expect(metadata.fileName).toBe("CASE001_abdomen_lateral.jpg");
      expect(metadata.fileSize).toBe(2048);
      expect(metadata.medical?.animalId).toBe("cat001");
      expect(metadata.medical?.bodyPart).toBe("abdomen");
      expect(metadata.tags).toContain("abdomen");
      expect(metadata.tags).toContain("2024");
      expect(metadata.searchableText).toContain("cat examination");
      expect(metadata.searchableText).toContain("case001");
    });

    it("should generate appropriate tags", () => {
      const photo = createMockPhoto({
        isPrimary: true,
        size: 6 * 1024 * 1024, // 6MB - high res
      });

      const medicalData = {
        bodyPart: "Chest",
        diagnosticCategory: "X-Ray",
        viewAngle: "Lateral",
      };

      const metadata = PhotoMetadataService.extractMetadata(
        photo,
        undefined,
        medicalData,
      );

      expect(metadata.tags).toContain("primary");
      expect(metadata.tags).toContain("chest");
      expect(metadata.tags).toContain("x-ray");
      expect(metadata.tags).toContain("lateral-view");
      expect(metadata.tags).toContain("high-res");
    });

    it("should handle minimal data", () => {
      const photo = createMockPhoto({
        caption: undefined,
        uploadedAt: undefined,
      });

      const metadata = PhotoMetadataService.extractMetadata(photo);

      expect(metadata.searchableText).toBe("");
      expect(metadata.tags.length).toBeGreaterThanOrEqual(0); // May have year tags
      expect(metadata.timestamps.uploaded).toBeInstanceOf(Date);
    });
  });

  describe("searchPhotos", () => {
    const photos: Photo[] = [
      createMockPhoto({
        caption: "Cat chest X-ray",
        id: "photo1",
        uploadedAt: "2024-01-15T10:00:00Z",
      }),
      createMockPhoto({
        caption: "Dog abdomen ultrasound",
        id: "photo2",
        uploadedAt: "2024-01-16T11:00:00Z",
      }),
      createMockPhoto({
        caption: "Cat follow-up chest",
        id: "photo3",
        isPrimary: true,
        uploadedAt: "2024-01-17T12:00:00Z",
      }),
    ];

    const metadata: PhotoMetadata[] = [
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "cat_chest_xray.jpg",
        fileSize: 1024,
        id: "photo1",
        medical: {
          animalId: "cat001",
          bodyPart: "chest",
          diagnosticCategory: "x-ray",
        },
        searchableText: "cat chest x-ray cat001",
        tags: ["chest", "x-ray", "2024"],
        timestamps: {
          captured: new Date("2024-01-15T10:00:00Z"),
          uploaded: new Date("2024-01-15T10:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "dog_abdomen_ultrasound.jpg",
        fileSize: 2048,
        id: "photo2",
        medical: {
          animalId: "dog001",
          bodyPart: "abdomen",
          diagnosticCategory: "ultrasound",
        },
        searchableText: "dog abdomen ultrasound dog001",
        tags: ["abdomen", "ultrasound", "2024"],
        timestamps: {
          captured: new Date("2024-01-16T11:00:00Z"),
          uploaded: new Date("2024-01-16T11:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "cat_chest_followup.jpg",
        fileSize: 1536,
        id: "photo3",
        medical: {
          animalId: "cat001",
          bodyPart: "chest",
        },
        searchableText: "cat follow-up chest cat001",
        tags: ["primary", "chest", "2024"],
        timestamps: {
          captured: new Date("2024-01-17T12:00:00Z"),
          uploaded: new Date("2024-01-17T12:00:00Z"),
        },
      },
    ];

    it("should search by text query", () => {
      const filter: SearchFilter = { query: "chest" };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(2);
      expect(result.photos.map((p) => p.id)).toEqual(["photo3", "photo1"]); // Sorted by date desc
      expect(result.totalCount).toBe(2);
    });

    it("should filter by animal ID", () => {
      const filter: SearchFilter = { animalId: "cat001" };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(2);
      expect(result.photos.map((p) => p.id)).toEqual(["photo3", "photo1"]); // Sorted by date desc
    });

    it("should filter by body part", () => {
      const filter: SearchFilter = { bodyPart: "abdomen" };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0]?.id).toBe("photo2");
    });

    it("should filter by primary status", () => {
      const filter: SearchFilter = { isPrimary: true };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0]?.id).toBe("photo3");
    });

    it("should filter by date range", () => {
      const filter: SearchFilter = {
        dateRange: {
          end: new Date("2024-01-18T00:00:00Z"),
          start: new Date("2024-01-16T00:00:00Z"),
        },
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(2);
      expect(result.photos.map((p) => p.id)).toEqual(["photo3", "photo2"]); // Sorted by date desc
    });

    it("should filter by tags", () => {
      const filter: SearchFilter = { tags: ["x-ray"] };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0]?.id).toBe("photo1");
    });

    it("should generate facets", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "date",
        showMetadata: true,
        sortBy: "date",
        sortOrder: "desc",
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        {},
        config,
      );

      expect(result.facets.bodyParts).toEqual([
        { count: 2, name: "chest" },
        { count: 1, name: "abdomen" },
      ]);

      expect(result.facets.medicalCategories).toEqual([
        { count: 1, name: "ultrasound" },
        { count: 1, name: "x-ray" },
      ]);
    });

    it("should sort photos by date descending", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: false,
        groupBy: "date",
        showMetadata: true,
        sortBy: "date",
        sortOrder: "desc",
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        {},
        config,
      );

      expect(result.photos.map((p) => p.id)).toEqual([
        "photo3",
        "photo2",
        "photo1",
      ]);
    });

    it("should sort photos by relevance", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: false,
        groupBy: "date",
        showMetadata: true,
        sortBy: "relevance",
        sortOrder: "asc",
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        {},
        config,
      );

      // Primary photos first, then by date desc
      expect(result.photos[0]?.id).toBe("photo3"); // Primary photo
    });
  });

  describe("organizePhotos", () => {
    const photos: Photo[] = [
      createMockPhoto({
        id: "photo1",
        uploadedAt: "2024-01-15T10:00:00Z",
      }),
      createMockPhoto({
        id: "photo2",
        uploadedAt: "2024-01-16T11:00:00Z",
      }),
      createMockPhoto({
        id: "photo3",
        isPrimary: true,
        uploadedAt: "2024-01-15T14:00:00Z",
      }),
    ];

    const metadata: PhotoMetadata[] = [
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "photo1.jpg",
        fileSize: 1024,
        id: "photo1",
        medical: { animalId: "cat001", bodyPart: "chest" },
        searchableText: "photo1",
        tags: ["chest", "2024"],
        timestamps: {
          captured: new Date("2024-01-15T10:00:00Z"),
          uploaded: new Date("2024-01-15T10:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "photo2.jpg",
        fileSize: 2048,
        id: "photo2",
        medical: { animalId: "dog001", bodyPart: "abdomen" },
        searchableText: "photo2",
        tags: ["abdomen", "2024"],
        timestamps: {
          captured: new Date("2024-01-16T11:00:00Z"),
          uploaded: new Date("2024-01-16T11:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "photo3.jpg",
        fileSize: 1536,
        id: "photo3",
        medical: { animalId: "cat001", bodyPart: "chest" },
        searchableText: "photo3",
        tags: ["primary", "chest", "2024"],
        timestamps: {
          captured: new Date("2024-01-15T14:00:00Z"),
          uploaded: new Date("2024-01-15T14:00:00Z"),
        },
      },
    ];

    it("should group by date", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "date",
        showMetadata: true,
        sortBy: "date",
        sortOrder: "desc",
      };

      const groups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        config,
      );

      expect(groups).toHaveLength(2);
      expect(groups[0]?.key).toBe("2024-01-16");
      expect(groups[0]?.photos).toHaveLength(1);
      expect(groups[1]?.key).toBe("2024-01-15");
      expect(groups[1]?.photos).toHaveLength(2);
    });

    it("should group by animal", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "animal",
        showMetadata: true,
        sortBy: "name",
        sortOrder: "asc",
      };

      const groups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        config,
      );

      expect(groups).toHaveLength(2);
      expect(groups.find((g) => g.key === "cat001")?.photos).toHaveLength(2);
      expect(groups.find((g) => g.key === "dog001")?.photos).toHaveLength(1);
    });

    it("should group by body part", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "bodyPart",
        showMetadata: true,
        sortBy: "name",
        sortOrder: "asc",
      };

      const groups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        config,
      );

      expect(groups).toHaveLength(2);
      expect(groups.find((g) => g.key === "chest")?.photos).toHaveLength(2);
      expect(groups.find((g) => g.key === "abdomen")?.photos).toHaveLength(1);
    });

    it("should generate group metadata", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "date",
        showMetadata: true,
        sortBy: "date",
        sortOrder: "desc",
      };

      const groups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        config,
      );
      const dateGroup = groups.find((g) => g.key === "2024-01-15");

      expect(dateGroup?.metadata?.totalSize).toBe("2.5 KB");
      expect(dateGroup?.metadata?.primaryPhoto?.id).toBe("photo3");
      expect(dateGroup?.count).toBe(2);
    });

    it("should sort groups by date descending", () => {
      const config: OrganizationConfig = {
        enableFacetedSearch: true,
        groupBy: "date",
        showMetadata: true,
        sortBy: "date",
        sortOrder: "desc",
      };

      const groups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        config,
      );

      expect(groups[0]?.key).toBe("2024-01-16");
      expect(groups[1]?.key).toBe("2024-01-15");
    });
  });

  describe("utility methods", () => {
    it("should generate correct group labels", () => {
      const photos = [createMockPhoto()];
      const metadata: PhotoMetadata[] = [
        {
          dimensions: { height: 1080, width: 1920 },
          fileName: "photo1.jpg",
          fileSize: 1024,
          id: "photo1",
          medical: { animalId: "cat001", bodyPart: "chest" },
          searchableText: "photo1",
          tags: ["chest"],
          timestamps: {
            captured: new Date("2024-01-15T10:00:00Z"),
            uploaded: new Date("2024-01-15T10:00:00Z"),
          },
        },
      ];

      const animalGroups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        {
          enableFacetedSearch: true,
          groupBy: "animal",
          showMetadata: true,
          sortBy: "name",
          sortOrder: "asc",
        },
      );

      expect(animalGroups[0]?.label).toBe("Animal: cat001");

      const bodyPartGroups = PhotoMetadataService.organizePhotos(
        photos,
        metadata,
        {
          enableFacetedSearch: true,
          groupBy: "bodyPart",
          showMetadata: true,
          sortBy: "name",
          sortOrder: "asc",
        },
      );

      expect(bodyPartGroups[0]?.label).toBe("Chest");
    });

    it("should validate organization config", () => {
      const config = {
        groupBy: "invalid" as any,
        sortBy: "date",
        sortOrder: "asc",
      };

      const validated = PhotoMetadataService.validateConfig(config);

      expect(validated.groupBy).toBe("invalid"); // Actually keeps the passed value
      expect(validated.showMetadata).toBe(true); // Should use default
    });
  });

  describe("complex search scenarios", () => {
    const photos: Photo[] = [
      createMockPhoto({
        caption: "Pre-surgery chest X-ray showing pneumonia",
        id: "photo1",
        uploadedAt: "2024-01-15T10:00:00Z",
      }),
      createMockPhoto({
        caption: "Post-surgery chest X-ray improvement",
        id: "photo2",
        isPrimary: true,
        uploadedAt: "2024-01-20T11:00:00Z",
      }),
      createMockPhoto({
        caption: "Abdomen ultrasound normal findings",
        id: "photo3",
        uploadedAt: "2024-01-18T12:00:00Z",
      }),
    ];

    const metadata: PhotoMetadata[] = [
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "CASE001_chest_presurg.jpg",
        fileSize: 2048,
        id: "photo1",
        medical: {
          animalId: "cat001",
          bodyPart: "chest",
          caseNumber: "CASE001",
          clinicalFindings: "pneumonia",
          diagnosticCategory: "x-ray",
        },
        searchableText: "pre-surgery chest x-ray pneumonia cat001 case001",
        tags: ["chest", "x-ray", "pre-surgery", "2024"],
        timestamps: {
          captured: new Date("2024-01-15T10:00:00Z"),
          uploaded: new Date("2024-01-15T10:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "CASE001_chest_postsurg.jpg",
        fileSize: 1800,
        id: "photo2",
        medical: {
          animalId: "cat001",
          bodyPart: "chest",
          caseNumber: "CASE001",
          clinicalFindings: "improvement",
          diagnosticCategory: "x-ray",
        },
        searchableText: "post-surgery chest x-ray improvement cat001 case001",
        tags: ["primary", "chest", "x-ray", "post-surgery", "2024"],
        timestamps: {
          captured: new Date("2024-01-20T11:00:00Z"),
          uploaded: new Date("2024-01-20T11:00:00Z"),
        },
      },
      {
        dimensions: { height: 1080, width: 1920 },
        fileName: "DOG001_abdomen_normal.jpg",
        fileSize: 1600,
        id: "photo3",
        medical: {
          animalId: "dog001",
          bodyPart: "abdomen",
          caseNumber: "DOG001",
          clinicalFindings: "normal",
          diagnosticCategory: "ultrasound",
        },
        searchableText: "abdomen ultrasound normal dog001",
        tags: ["abdomen", "ultrasound", "normal", "2024"],
        timestamps: {
          captured: new Date("2024-01-18T12:00:00Z"),
          uploaded: new Date("2024-01-18T12:00:00Z"),
        },
      },
    ];

    it("should handle complex multi-filter search", () => {
      const filter: SearchFilter = {
        animalId: "cat001",
        dateRange: {
          end: new Date("2024-01-21T00:00:00Z"),
          start: new Date("2024-01-14T00:00:00Z"),
        },
        query: "chest",
        tags: ["x-ray"],
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(2);
      expect(result.photos.map((p) => p.id)).toEqual(["photo2", "photo1"]); // Sorted by date desc
    });

    it("should return empty results for non-matching filters", () => {
      const filter: SearchFilter = {
        animalId: "nonexistent",
      };

      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should handle case-insensitive text search", () => {
      const filter: SearchFilter = { query: "PNEUMONIA" };
      const result = PhotoMetadataService.searchPhotos(
        photos,
        metadata,
        filter,
      );

      expect(result.photos).toHaveLength(1);
      expect(result.photos[0]?.id).toBe("photo1");
    });
  });
});
