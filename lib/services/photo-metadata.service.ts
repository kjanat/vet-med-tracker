/**
 * PhotoMetadataService
 *
 * Handles EXIF data extraction, photo organization, search/filtering,
 * and medical photo compliance features for veterinary documentation.
 */

import type { Photo } from "./photo-upload.service";

export interface PhotoMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  exif?: {
    camera?: string;
    lens?: string;
    exposureTime?: string;
    fNumber?: string;
    iso?: string;
    focalLength?: string;
    flash?: boolean;
    gps?: {
      latitude?: number;
      longitude?: number;
      altitude?: number;
    };
  };
  medical?: {
    animalId?: string;
    caseNumber?: string;
    bodyPart?: string;
    viewAngle?: string;
    clinicalFindings?: string;
    veterinarianId?: string;
    visitDate?: string;
    diagnosticCategory?: string;
  };
  timestamps: {
    captured: Date;
    uploaded: Date;
    lastModified?: Date;
  };
  tags: string[];
  searchableText: string;
}

export interface SearchFilter {
  query?: string;
  animalId?: string;
  caseNumber?: string;
  bodyPart?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  medicalCategory?: string;
  isPrimary?: boolean;
}

export interface SearchResult {
  photos: Photo[];
  totalCount: number;
  facets: {
    bodyParts: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    dateRanges: Array<{ label: string; count: number }>;
    medicalCategories: Array<{ name: string; count: number }>;
  };
}

export interface OrganizationConfig {
  groupBy: "date" | "animal" | "case" | "bodyPart" | "tag";
  sortBy: "date" | "name" | "size" | "relevance";
  sortOrder: "asc" | "desc";
  showMetadata: boolean;
  enableFacetedSearch: boolean;
}

export interface PhotoGroup {
  key: string;
  label: string;
  photos: Photo[];
  count: number;
  metadata?: {
    dateRange?: string;
    totalSize?: string;
    primaryPhoto?: Photo;
  };
}

export class PhotoMetadataService {
  private static readonly DEFAULT_CONFIG: OrganizationConfig = {
    enableFacetedSearch: true,
    groupBy: "date",
    showMetadata: true,
    sortBy: "date",
    sortOrder: "desc",
  };

  /**
   * Extract metadata from photo file and existing data
   */
  static extractMetadata(
    photo: Photo,
    file?: File,
    medicalData?: Partial<PhotoMetadata["medical"]>,
  ): PhotoMetadata {
    const now = new Date();

    // Create searchable text from all relevant fields
    const searchableFields = [
      photo.caption || "",
      medicalData?.animalId || "",
      medicalData?.caseNumber || "",
      medicalData?.bodyPart || "",
      medicalData?.clinicalFindings || "",
      medicalData?.diagnosticCategory || "",
    ];

    const searchableText = searchableFields
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // Generate tags from various sources
    const tags = PhotoMetadataService.generateAutoTags(photo, medicalData);

    return {
      dimensions: photo.dimensions || { height: 0, width: 0 },
      fileName: file?.name || `photo-${photo.id}`,
      fileSize: file?.size || photo.size || 0,
      id: photo.id,
      medical: medicalData,
      searchableText,
      tags,
      timestamps: {
        captured: file?.lastModified ? new Date(file.lastModified) : now,
        uploaded: new Date(photo.uploadedAt || now),
      },
    };
  }

  /**
   * Search photos with filtering and faceted search
   */
  static searchPhotos(
    photos: Photo[],
    metadata: PhotoMetadata[],
    filter: SearchFilter,
    config: OrganizationConfig = PhotoMetadataService.DEFAULT_CONFIG,
  ): SearchResult {
    const metadataMap = new Map(metadata.map((m) => [m.id, m]));

    // Apply filters
    let filteredPhotos = photos.filter((photo) => {
      const meta = metadataMap.get(photo.id);
      return PhotoMetadataService.matchesFilter(photo, meta, filter);
    });

    // Apply sorting
    filteredPhotos = PhotoMetadataService.sortPhotos(
      filteredPhotos,
      metadataMap,
      config,
    );

    // Generate facets for search refinement
    const facets = config.enableFacetedSearch
      ? PhotoMetadataService.generateFacets(filteredPhotos, metadataMap)
      : {
          bodyParts: [],
          dateRanges: [],
          medicalCategories: [],
          tags: [],
        };

    return {
      facets,
      photos: filteredPhotos,
      totalCount: filteredPhotos.length,
    };
  }

  /**
   * Organize photos into groups based on configuration
   */
  static organizePhotos(
    photos: Photo[],
    metadata: PhotoMetadata[],
    config: OrganizationConfig = PhotoMetadataService.DEFAULT_CONFIG,
  ): PhotoGroup[] {
    const metadataMap = new Map(metadata.map((m) => [m.id, m]));

    // Group photos
    const groups = new Map<string, Photo[]>();

    photos.forEach((photo) => {
      const meta = metadataMap.get(photo.id);
      const groupKey = PhotoMetadataService.getGroupKey(
        photo,
        meta,
        config.groupBy,
      );

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(photo);
    });

    // Convert to PhotoGroup array with metadata
    const photoGroups: PhotoGroup[] = Array.from(groups.entries()).map(
      ([key, groupPhotos]) => {
        const sortedPhotos = PhotoMetadataService.sortPhotos(
          groupPhotos,
          metadataMap,
          config,
        );

        return {
          count: sortedPhotos.length,
          key,
          label: PhotoMetadataService.getGroupLabel(key, config.groupBy),
          metadata: PhotoMetadataService.generateGroupMetadata(
            sortedPhotos,
            metadataMap,
          ),
          photos: sortedPhotos,
        };
      },
    );

    // Sort groups
    return PhotoMetadataService.sortGroups(photoGroups, config);
  }

  /**
   * Extract EXIF data from image file (simplified implementation)
   */
  static async extractExifData(
    _file: File,
  ): Promise<PhotoMetadata["exif"] | null> {
    try {
      // This would typically use an EXIF library like exif-js or piexifjs
      // For now, return basic information we can derive

      return {
        camera: "Unknown", // Would extract from EXIF
        flash: false, // Would extract from EXIF
        iso: "Auto", // Would extract from EXIF
      };
    } catch (error) {
      console.warn("Failed to extract EXIF data:", error);
      return null;
    }
  }

  /**
   * Validate organization configuration
   */
  static validateConfig(config: {
    groupBy: "date" | "animal" | "case" | "bodyPart" | "tag";
    sortBy: "date" | "name" | "size" | "relevance";
    sortOrder: "asc" | "desc";
  }): OrganizationConfig {
    return { ...PhotoMetadataService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate auto tags from photo data
   */
  private static generateAutoTags(
    photo: Photo,
    medicalData?: Partial<PhotoMetadata["medical"]>,
  ): string[] {
    const tags: string[] = [];

    // Primary photo tag
    if (photo.isPrimary) {
      tags.push("primary");
    }

    // Medical tags
    if (medicalData?.bodyPart) {
      tags.push(medicalData.bodyPart.toLowerCase());
    }

    if (medicalData?.diagnosticCategory) {
      tags.push(medicalData.diagnosticCategory.toLowerCase());
    }

    if (medicalData?.viewAngle) {
      tags.push(`${medicalData.viewAngle.toLowerCase()}-view`);
    }

    // Date-based tags
    const uploadDate = photo.uploadedAt
      ? new Date(photo.uploadedAt)
      : new Date();
    tags.push(`${uploadDate.getFullYear()}`);
    tags.push(
      `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, "0")}`,
    );

    // Size-based tags
    if (photo.size) {
      if (photo.size > 5 * 1024 * 1024) {
        tags.push("high-res");
      } else if (photo.size < 1024 * 1024) {
        tags.push("low-res");
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check if photo matches filter criteria
   */
  private static matchesFilter(
    photo: Photo,
    metadata: PhotoMetadata | undefined,
    filter: SearchFilter,
  ): boolean {
    return (
      PhotoMetadataService.matchesText(photo, metadata, filter.query) &&
      PhotoMetadataService.matchesAnimalId(metadata, filter.animalId) &&
      PhotoMetadataService.matchesCaseNumber(metadata, filter.caseNumber) &&
      PhotoMetadataService.matchesBodyPart(metadata, filter.bodyPart) &&
      PhotoMetadataService.matchesPrimary(photo, filter.isPrimary) &&
      PhotoMetadataService.matchesDateRange(
        photo,
        metadata,
        filter.dateRange,
      ) &&
      PhotoMetadataService.matchesTags(metadata, filter.tags)
    );
  }

  private static matchesText(
    photo: Photo,
    metadata: PhotoMetadata | undefined,
    query?: string,
  ): boolean {
    if (!query) return true;
    const queryLower = query.toLowerCase();
    const searchableText =
      metadata?.searchableText || photo.caption?.toLowerCase() || "";
    return searchableText.includes(queryLower);
  }

  private static matchesAnimalId(
    metadata: PhotoMetadata | undefined,
    animalId?: string,
  ): boolean {
    if (!animalId) return true;
    return metadata?.medical?.animalId === animalId;
  }

  private static matchesCaseNumber(
    metadata: PhotoMetadata | undefined,
    caseNumber?: string,
  ): boolean {
    if (!caseNumber) return true;
    return metadata?.medical?.caseNumber === caseNumber;
  }

  private static matchesBodyPart(
    metadata: PhotoMetadata | undefined,
    bodyPart?: string,
  ): boolean {
    if (!bodyPart) return true;
    return metadata?.medical?.bodyPart === bodyPart;
  }

  private static matchesPrimary(photo: Photo, isPrimary?: boolean): boolean {
    if (isPrimary === undefined) return true;
    return photo.isPrimary === isPrimary;
  }

  private static matchesDateRange(
    photo: Photo,
    metadata: PhotoMetadata | undefined,
    dateRange?: { start: Date; end: Date },
  ): boolean {
    if (!dateRange) return true;
    const photoDate =
      metadata?.timestamps.captured || new Date(photo.uploadedAt || 0);
    return photoDate >= dateRange.start && photoDate <= dateRange.end;
  }

  private static matchesTags(
    metadata: PhotoMetadata | undefined,
    tags?: string[],
  ): boolean {
    if (!tags || tags.length === 0) return true;
    const photoTags = metadata?.tags || [];
    return tags.every((tag) => photoTags.includes(tag));
  }

  /**
   * Sort photos based on configuration
   */
  private static sortPhotos(
    photos: Photo[],
    metadataMap: Map<string, PhotoMetadata>,
    config: OrganizationConfig,
  ): Photo[] {
    const sorter = PhotoMetadataService.getPhotoSorter(metadataMap, config);
    // Use slice() to avoid modifying the original array, as sort() is in-place
    return photos.slice().sort(sorter);
  }

  private static getPhotoSorter(
    metadataMap: Map<string, PhotoMetadata>,
    config: OrganizationConfig,
  ): (a: Photo, b: Photo) => number {
    const { sortBy, sortOrder } = config;

    const getComparison = (a: Photo, b: Photo): number => {
      const metaA = metadataMap.get(a.id);
      const metaB = metadataMap.get(b.id);

      switch (sortBy) {
        case "date":
          return PhotoMetadataService.compareByDate(metaA, metaB, a, b);
        case "name":
          return PhotoMetadataService.compareByName(metaA, metaB, a, b);
        case "size":
          return PhotoMetadataService.compareBySize(metaA, metaB, a, b);
        case "relevance":
          return PhotoMetadataService.compareByRelevance(a, b);
        default:
          return 0;
      }
    };

    return (a: Photo, b: Photo) => {
      const comparison = getComparison(a, b);
      return sortOrder === "desc" ? -comparison : comparison;
    };
  }

  private static compareByDate(
    metaA: PhotoMetadata | undefined,
    metaB: PhotoMetadata | undefined,
    a: Photo,
    b: Photo,
  ): number {
    const dateA = metaA?.timestamps.captured || new Date(a.uploadedAt || 0);
    const dateB = metaB?.timestamps.captured || new Date(b.uploadedAt || 0);
    return dateA.getTime() - dateB.getTime();
  }

  private static compareByName(
    metaA: PhotoMetadata | undefined,
    metaB: PhotoMetadata | undefined,
    a: Photo,
    b: Photo,
  ): number {
    const nameA = metaA?.fileName || a.id;
    const nameB = metaB?.fileName || b.id;
    return nameA.localeCompare(nameB);
  }

  private static compareBySize(
    metaA: PhotoMetadata | undefined,
    metaB: PhotoMetadata | undefined,
    a: Photo,
    b: Photo,
  ): number {
    const sizeA = metaA?.fileSize || a.size || 0;
    const sizeB = metaB?.fileSize || b.size || 0;
    return sizeA - sizeB;
  }

  private static compareByRelevance(a: Photo, b: Photo): number {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    const dateA = new Date(a.uploadedAt || 0);
    const dateB = new Date(b.uploadedAt || 0);
    return dateB.getTime() - dateA.getTime(); // Default to reverse chronological
  }

  /**
   * Generate group key for photo organization
   */
  private static getGroupKey(
    photo: Photo,
    metadata: PhotoMetadata | undefined,
    groupBy: OrganizationConfig["groupBy"],
  ): string {
    switch (groupBy) {
      case "animal":
        return metadata?.medical?.animalId || "unknown-animal";
      case "case":
        return metadata?.medical?.caseNumber || "no-case";
      case "bodyPart":
        return metadata?.medical?.bodyPart || "unknown-bodypart";
      case "tag":
        return metadata?.tags[0] || "untagged";
      default: {
        const date =
          metadata?.timestamps.captured || new Date(photo.uploadedAt || 0);
        return date.toISOString().slice(0, 10); // YYYY-MM-DD format
      }
    }
  }

  /**
   * Generate display label for group
   */
  private static getGroupLabel(
    key: string,
    groupBy: OrganizationConfig["groupBy"],
  ): string {
    switch (groupBy) {
      case "animal":
        return `Animal: ${key}`;
      case "case":
        return `Case: ${key}`;
      case "bodyPart":
        return key.charAt(0).toUpperCase() + key.slice(1);
      case "tag":
        return `#${key}`;
      default:
        return new Date(key).toLocaleDateString();
    }
  }

  /**
   * Generate metadata for photo group
   */
  private static generateGroupMetadata(
    photos: Photo[],
    metadataMap: Map<string, PhotoMetadata>,
  ): PhotoGroup["metadata"] {
    const dates = photos
      .map(
        (p) =>
          metadataMap.get(p.id)?.timestamps.captured ||
          new Date(p.uploadedAt || 0),
      )
      .sort((a, b) => a.getTime() - b.getTime());

    const totalSize = photos.reduce((sum, p) => {
      const meta = metadataMap.get(p.id);
      return sum + (meta?.fileSize || p.size || 0);
    }, 0);

    const primaryPhoto = photos.find((p) => p.isPrimary);

    return {
      dateRange:
        dates.length > 1
          ? `${dates[0]?.toLocaleDateString()} - ${dates[dates.length - 1]?.toLocaleDateString()}`
          : dates[0]?.toLocaleDateString(),
      primaryPhoto,
      totalSize: PhotoMetadataService.formatFileSize(totalSize),
    };
  }

  /**
   * Sort groups based on configuration
   */
  private static sortGroups(
    groups: PhotoGroup[],
    config: OrganizationConfig,
  ): PhotoGroup[] {
    return groups.sort((a, b) => {
      let comparison = 0;

      switch (config.sortBy) {
        case "name":
          comparison = a.label.localeCompare(b.label);
          break;
        case "size":
          comparison = a.count - b.count;
          break;
        default:
          // Sort by the date in the group key or label
          comparison = a.key.localeCompare(b.key);
          break;
      }

      return config.sortOrder === "desc" ? -comparison : comparison;
    });
  }

  /**
   * Generate search facets
   */
  private static generateFacets(
    photos: Photo[],
    metadataMap: Map<string, PhotoMetadata>,
  ): SearchResult["facets"] {
    const bodyParts = new Map<string, number>();
    const tags = new Map<string, number>();
    const medicalCategories = new Map<string, number>();

    photos.forEach((photo) => {
      const meta = metadataMap.get(photo.id);

      // Body parts
      if (meta?.medical?.bodyPart) {
        bodyParts.set(
          meta.medical.bodyPart,
          (bodyParts.get(meta.medical.bodyPart) || 0) + 1,
        );
      }

      // Tags
      meta?.tags.forEach((tag) => {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      });

      // Medical categories
      if (meta?.medical?.diagnosticCategory) {
        medicalCategories.set(
          meta.medical.diagnosticCategory,
          (medicalCategories.get(meta.medical.diagnosticCategory) || 0) + 1,
        );
      }
    });

    return {
      bodyParts: Array.from(bodyParts.entries())
        .map(([name, count]) => ({ count, name }))
        .sort((a, b) => b.count - a.count),
      dateRanges: [], // Would implement date range facets
      medicalCategories: Array.from(medicalCategories.entries())
        .map(([name, count]) => ({ count, name }))
        .sort((a, b) => b.count - a.count),
      tags: Array.from(tags.entries())
        .map(([name, count]) => ({ count, name }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  }
}
