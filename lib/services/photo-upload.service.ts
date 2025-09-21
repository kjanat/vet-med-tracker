/**
 * PhotoUploadService
 *
 * Handles file validation, upload progress tracking, batch uploads,
 * and medical photo compliance for veterinary documentation.
 */

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  isPrimary?: boolean;
  uploadedAt?: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  medicalCompliance: {
    isCompliant: boolean;
    issues: string[];
  };
}

export interface UploadConfig {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes: string[];
  requireMedicalCompliance: boolean;
  autoGenerateThumbnails: boolean;
  compressionQuality: number; // 0-1
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  error?: string;
  estimatedTimeRemaining?: number; // in seconds
}

export interface BatchUploadState {
  files: UploadProgress[];
  overallProgress: number;
  isUploading: boolean;
  completedCount: number;
  failedCount: number;
  startTime?: Date;
}

export interface MedicalPhotoMetadata {
  animalId?: string;
  veterinarianId?: string;
  caseNumber?: string;
  bodyPart?: string;
  viewAngle?: string;
  clinicalFindings?: string;
  captureDate: Date;
  deviceInfo?: {
    camera: string;
    settings: string;
  };
}

export class PhotoUploadService {
  private static readonly DEFAULT_CONFIG: UploadConfig = {
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic", // iPhone photos
      "image/tiff", // Medical imaging
    ],
    autoGenerateThumbnails: true,
    compressionQuality: 0.85,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 20,
    requireMedicalCompliance: true,
  };

  /**
   * Validate a single file for upload
   */
  static validateFile(
    file: File,
    config: UploadConfig = PhotoUploadService.DEFAULT_CONFIG,
  ): UploadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const medicalIssues: string[] = [];

    // File size validation
    if (file.size > config.maxFileSize) {
      errors.push(
        `File size ${PhotoUploadService.formatFileSize(file.size)} exceeds maximum allowed size ${PhotoUploadService.formatFileSize(config.maxFileSize)}`,
      );
    }

    // File type validation
    if (!config.allowedTypes.includes(file.type)) {
      errors.push(
        `File type ${file.type} is not allowed. Supported types: ${config.allowedTypes.join(", ")}`,
      );
    }

    // Medical compliance checks
    if (config.requireMedicalCompliance) {
      const medicalCompliance =
        PhotoUploadService.validateMedicalCompliance(file);
      medicalIssues.push(...medicalCompliance.issues);

      // File naming convention for medical photos
      if (!PhotoUploadService.isValidMedicalFileName(file.name)) {
        warnings.push(
          "File name should follow medical naming convention (case_number_body_part_angle.ext)",
        );
      }

      // Quality checks for medical documentation
      if (file.size < 100 * 1024) {
        // Less than 100KB
        warnings.push(
          "File size may be too small for medical documentation quality requirements",
        );
      }
    }

    // EXIF data presence (for authenticity) - only for medical compliance
    if (
      config.requireMedicalCompliance &&
      !PhotoUploadService.hasMetadata(file)
    ) {
      warnings.push(
        "Photo lacks metadata. Original photos with EXIF data are preferred for medical records",
      );
    }

    return {
      errors,
      isValid: errors.length === 0,
      medicalCompliance: {
        isCompliant: medicalIssues.length === 0,
        issues: medicalIssues,
      },
      warnings,
    };
  }

  /**
   * Validate batch of files
   */
  static validateBatch(
    files: File[],
    config: UploadConfig = PhotoUploadService.DEFAULT_CONFIG,
  ): {
    validFiles: File[];
    invalidFiles: Array<{ file: File; validation: UploadValidationResult }>;
    batchWarnings: string[];
  } {
    const validFiles: File[] = [];
    const invalidFiles: Array<{
      file: File;
      validation: UploadValidationResult;
    }> = [];
    const batchWarnings: string[] = [];

    // Check total count
    if (files.length > config.maxFiles) {
      batchWarnings.push(
        `Batch contains ${files.length} files, maximum allowed is ${config.maxFiles}`,
      );
    }

    // Validate each file
    files.forEach((file) => {
      const validation = PhotoUploadService.validateFile(file, config);

      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, validation });
      }
    });

    // Check for duplicate files
    const duplicates = PhotoUploadService.findDuplicateFiles(files);
    if (duplicates.length > 0) {
      batchWarnings.push(`Duplicate files detected: ${duplicates.join(", ")}`);
    }

    return {
      batchWarnings,
      invalidFiles,
      validFiles,
    };
  }

  /**
   * Create initial upload progress state
   */
  static createUploadProgress(file: File): UploadProgress {
    return {
      fileId: PhotoUploadService.generateFileId(file),
      fileName: file.name,
      progress: 0,
      status: "pending",
    };
  }

  /**
   * Create initial batch upload state
   */
  static createBatchUploadState(files: File[]): BatchUploadState {
    return {
      completedCount: 0,
      failedCount: 0,
      files: files.map((file) => PhotoUploadService.createUploadProgress(file)),
      isUploading: false,
      overallProgress: 0,
    };
  }

  /**
   * Update upload progress for a specific file
   */
  static updateFileProgress(
    batchState: BatchUploadState,
    fileId: string,
    progress: number,
    status?: UploadProgress["status"],
    error?: string,
  ): BatchUploadState {
    const updatedFiles = batchState.files.map((file) => {
      if (file.fileId === fileId) {
        return {
          ...file,
          error,
          progress,
          status: status || file.status,
        };
      }
      return file;
    });

    const completedCount = updatedFiles.filter(
      (f) => f.status === "completed",
    ).length;
    const failedCount = updatedFiles.filter(
      (f) => f.status === "failed",
    ).length;
    const overallProgress =
      PhotoUploadService.calculateOverallProgress(updatedFiles);

    return {
      ...batchState,
      completedCount,
      failedCount,
      files: updatedFiles,
      isUploading: completedCount + failedCount < updatedFiles.length,
      overallProgress,
    };
  }

  /**
   * Calculate overall upload progress
   */
  private static calculateOverallProgress(files: UploadProgress[]): number {
    if (files.length === 0) return 0;

    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(totalProgress / files.length);
  }

  /**
   * Validate medical compliance for veterinary photos
   */
  private static validateMedicalCompliance(file: File): { issues: string[] } {
    const issues: string[] = [];

    // Check file format suitability for medical documentation
    const medicalFormats = ["image/jpeg", "image/tiff", "image/png"];
    if (!medicalFormats.includes(file.type)) {
      issues.push(
        `Format ${file.type} may not meet medical documentation standards`,
      );
    }

    // Check for minimum resolution requirements (estimated)
    if (file.size < 500 * 1024) {
      // Less than 500KB
      issues.push(
        "Image resolution may be insufficient for medical documentation",
      );
    }

    return { issues };
  }

  /**
   * Check if filename follows medical convention
   */
  private static isValidMedicalFileName(fileName: string): boolean {
    // Pattern: case_number_body_part_angle.ext or similar structured naming
    const medicalPattern = /^[a-zA-Z0-9]+_[a-zA-Z0-9]+_[a-zA-Z0-9]+\.\w+$/;
    const datePattern = /\d{4}-\d{2}-\d{2}/; // Contains date
    const structuredPattern = /^[A-Z]{2,}\d+_/; // Starts with case prefix

    return (
      medicalPattern.test(fileName) ||
      datePattern.test(fileName) ||
      structuredPattern.test(fileName)
    );
  }

  /**
   * Check if file has metadata (simplified check)
   */
  private static hasMetadata(file: File): boolean {
    // This is a simplified check - in practice, you'd read EXIF data
    return file.lastModified > 0 && file.size > 1024; // Basic indicators
  }

  /**
   * Find duplicate files in a batch
   */
  private static findDuplicateFiles(files: File[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    files.forEach((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (seen.has(key)) {
        duplicates.push(file.name);
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  /**
   * Generate unique file ID
   */
  private static generateFileId(file: File): string {
    return `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, "")}-${file.size}`;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Estimate upload time remaining
   */
  static estimateTimeRemaining(
    batchState: BatchUploadState,
    _currentFileProgress: number,
  ): number {
    if (!batchState.startTime || batchState.overallProgress === 0) {
      return 0;
    }

    const elapsedTime = (Date.now() - batchState.startTime.getTime()) / 1000;
    const remainingProgress = 100 - batchState.overallProgress;
    const progressRate = batchState.overallProgress / elapsedTime;

    return progressRate > 0 ? Math.round(remainingProgress / progressRate) : 0;
  }

  /**
   * Create medical photo metadata template
   */
  static createMedicalMetadata(
    animalId: string,
    veterinarianId: string,
    caseNumber?: string,
  ): Partial<MedicalPhotoMetadata> {
    return {
      animalId,
      captureDate: new Date(),
      caseNumber,
      veterinarianId,
    };
  }

  /**
   * Validate upload configuration
   */
  static validateConfig(config: Partial<UploadConfig>): UploadConfig {
    const validated = { ...PhotoUploadService.DEFAULT_CONFIG, ...config };

    if (validated.maxFileSize <= 0) {
      throw new Error("maxFileSize must be greater than 0");
    }

    if (validated.maxFiles <= 0) {
      throw new Error("maxFiles must be greater than 0");
    }

    if (validated.compressionQuality < 0 || validated.compressionQuality > 1) {
      throw new Error("compressionQuality must be between 0 and 1");
    }

    if (validated.allowedTypes.length === 0) {
      throw new Error("allowedTypes cannot be empty");
    }

    return validated;
  }
}
