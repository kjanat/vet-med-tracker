// @ts-nocheck
import { describe, expect, it } from "bun:test";
import {
  type BatchUploadState,
  PhotoUploadService,
  type UploadConfig,
} from "../photo-upload.service";

describe("PhotoUploadService", () => {
  const createMockFile = (
    options: {
      name?: string;
      size?: number;
      type?: string;
      lastModified?: number;
    } = {},
  ): File => {
    const {
      name = "test-photo.jpg",
      size = 1024 * 1024, // 1MB
      type = "image/jpeg",
      lastModified = Date.now(),
    } = options;

    const file = new File(["mock content"], name, {
      lastModified,
      type,
    });

    // Mock the size property
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });

    return file;
  };

  describe("validateFile", () => {
    const defaultConfig: UploadConfig = {
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      autoGenerateThumbnails: true,
      compressionQuality: 0.85,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 20,
      requireMedicalCompliance: true,
    };

    it("should validate valid file", () => {
      const file = createMockFile({
        name: "CASE001_abdomen_lateral.jpg",
        size: 2 * 1024 * 1024, // 2MB
        type: "image/jpeg",
      });

      const result = PhotoUploadService.validateFile(file, defaultConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.medicalCompliance.isCompliant).toBe(true);
    });

    it("should reject file exceeding size limit", () => {
      const file = createMockFile({
        size: 15 * 1024 * 1024, // 15MB
      });

      const result = PhotoUploadService.validateFile(file, defaultConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(
        true,
      );
    });

    it("should reject unsupported file type", () => {
      const file = createMockFile({
        type: "image/gif",
      });

      const result = PhotoUploadService.validateFile(file, defaultConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("not allowed"))).toBe(true);
    });

    it("should warn about non-medical filename", () => {
      const file = createMockFile({
        name: "random_photo.jpg",
      });

      const result = PhotoUploadService.validateFile(file, defaultConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes("naming convention"))).toBe(
        true,
      );
    });

    it("should warn about small file size", () => {
      const file = createMockFile({
        size: 50 * 1024, // 50KB
      });

      const result = PhotoUploadService.validateFile(file, defaultConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes("too small"))).toBe(true);
    });

    it("should skip medical compliance when disabled", () => {
      const nonMedicalConfig = {
        ...defaultConfig,
        requireMedicalCompliance: false,
      };

      const file = createMockFile({
        name: "vacation_photo.jpg",
        size: 50 * 1024,
      });

      const result = PhotoUploadService.validateFile(file, nonMedicalConfig);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(0); // No warnings when medical compliance disabled
    });

    it("should validate medical file formats", () => {
      const tiffFile = createMockFile({
        name: "CASE001_xray_lateral.tiff",
        type: "image/tiff",
      });

      const config = {
        ...defaultConfig,
        allowedTypes: [...defaultConfig.allowedTypes, "image/tiff"],
      };

      const result = PhotoUploadService.validateFile(tiffFile, config);

      expect(result.isValid).toBe(true);
      expect(result.medicalCompliance.isCompliant).toBe(true);
    });
  });

  describe("validateBatch", () => {
    const defaultConfig: UploadConfig = {
      allowedTypes: ["image/jpeg", "image/png"],
      autoGenerateThumbnails: true,
      compressionQuality: 0.85,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 3, // Small limit for testing
      requireMedicalCompliance: false,
    };

    it("should validate valid batch", () => {
      const files = [
        createMockFile({ name: "photo1.jpg" }),
        createMockFile({ name: "photo2.png", type: "image/png" }),
      ];

      const result = PhotoUploadService.validateBatch(files, defaultConfig);

      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(0);
      expect(result.batchWarnings).toHaveLength(0);
    });

    it("should warn about batch size limit", () => {
      const files = [
        createMockFile({ name: "photo1.jpg" }),
        createMockFile({ name: "photo2.jpg" }),
        createMockFile({ name: "photo3.jpg" }),
        createMockFile({ name: "photo4.jpg" }),
      ];

      const result = PhotoUploadService.validateBatch(files, defaultConfig);

      expect(
        result.batchWarnings.some((w) => w.includes("maximum allowed")),
      ).toBe(true);
    });

    it("should separate valid and invalid files", () => {
      const files = [
        createMockFile({ name: "valid.jpg", type: "image/jpeg" }),
        createMockFile({ name: "invalid.gif", type: "image/gif" }),
        createMockFile({ name: "too-big.jpg", size: 20 * 1024 * 1024 }),
      ];

      const result = PhotoUploadService.validateBatch(files, defaultConfig);

      expect(result.validFiles).toHaveLength(1); // only valid.jpg
      expect(result.invalidFiles).toHaveLength(2); // invalid.gif and too-big.jpg
      expect(result.validFiles[0].name).toBe("valid.jpg");
    });

    it("should detect duplicate files", () => {
      const file1 = createMockFile({ name: "photo.jpg", size: 1024 });
      const file2 = createMockFile({ name: "photo.jpg", size: 1024 });

      // Mock lastModified to be the same
      Object.defineProperty(file1, "lastModified", { value: 123456789 });
      Object.defineProperty(file2, "lastModified", { value: 123456789 });

      const result = PhotoUploadService.validateBatch(
        [file1, file2],
        defaultConfig,
      );

      expect(
        result.batchWarnings.some((w) => w.includes("Duplicate files")),
      ).toBe(true);
    });
  });

  describe("upload progress management", () => {
    it("should create upload progress", () => {
      const file = createMockFile({ name: "test.jpg" });
      const progress = PhotoUploadService.createUploadProgress(file);

      expect(progress.fileName).toBe("test.jpg");
      expect(progress.progress).toBe(0);
      expect(progress.status).toBe("pending");
      expect(progress.fileId).toContain("test");
    });

    it("should create batch upload state", () => {
      const files = [
        createMockFile({ name: "photo1.jpg" }),
        createMockFile({ name: "photo2.jpg" }),
      ];

      const batchState = PhotoUploadService.createBatchUploadState(files);

      expect(batchState.files).toHaveLength(2);
      expect(batchState.overallProgress).toBe(0);
      expect(batchState.isUploading).toBe(false);
      expect(batchState.completedCount).toBe(0);
      expect(batchState.failedCount).toBe(0);
    });

    it("should update file progress", () => {
      const files = [
        createMockFile({ name: "photo1.jpg" }),
        createMockFile({ name: "photo2.jpg" }),
      ];

      let batchState = PhotoUploadService.createBatchUploadState(files);
      const fileId = batchState.files[0].fileId;

      // Update first file to 50% progress
      batchState = PhotoUploadService.updateFileProgress(
        batchState,
        fileId,
        50,
        "uploading",
      );

      expect(batchState.files[0].progress).toBe(50);
      expect(batchState.files[0].status).toBe("uploading");
      expect(batchState.overallProgress).toBe(25); // (50 + 0) / 2
      expect(batchState.isUploading).toBe(true);

      // Complete first file
      batchState = PhotoUploadService.updateFileProgress(
        batchState,
        fileId,
        100,
        "completed",
      );

      expect(batchState.completedCount).toBe(1);
      expect(batchState.overallProgress).toBe(50); // (100 + 0) / 2
    });

    it("should handle upload errors", () => {
      const files = [createMockFile({ name: "photo.jpg" })];
      let batchState = PhotoUploadService.createBatchUploadState(files);
      const fileId = batchState.files[0].fileId;

      batchState = PhotoUploadService.updateFileProgress(
        batchState,
        fileId,
        0,
        "failed",
        "Network error",
      );

      expect(batchState.files[0].status).toBe("failed");
      expect(batchState.files[0].error).toBe("Network error");
      expect(batchState.failedCount).toBe(1);
      expect(batchState.isUploading).toBe(false);
    });
  });

  describe("utility methods", () => {
    it("should format file sizes correctly", () => {
      expect(PhotoUploadService.formatFileSize(0)).toBe("0 Bytes");
      expect(PhotoUploadService.formatFileSize(1024)).toBe("1 KB");
      expect(PhotoUploadService.formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(PhotoUploadService.formatFileSize(1024 * 1024 * 1024)).toBe(
        "1 GB",
      );
      expect(PhotoUploadService.formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should estimate time remaining", () => {
      const batchState: BatchUploadState = {
        completedCount: 0,
        failedCount: 0,
        files: [],
        isUploading: true,
        overallProgress: 25, // 25% complete
        startTime: new Date(Date.now() - 10000), // 10 seconds ago
      };

      const timeRemaining = PhotoUploadService.estimateTimeRemaining(
        batchState,
        50,
      );

      expect(timeRemaining).toBe(30); // 75% remaining at 2.5%/sec = 30 seconds
    });

    it("should handle zero progress in time estimation", () => {
      const batchState: BatchUploadState = {
        completedCount: 0,
        failedCount: 0,
        files: [],
        isUploading: true,
        overallProgress: 0,
        startTime: new Date(),
      };

      const timeRemaining = PhotoUploadService.estimateTimeRemaining(
        batchState,
        0,
      );

      expect(timeRemaining).toBe(0);
    });

    it("should create medical metadata template", () => {
      const metadata = PhotoUploadService.createMedicalMetadata(
        "animal123",
        "vet456",
        "case789",
      );

      expect(metadata.animalId).toBe("animal123");
      expect(metadata.veterinarianId).toBe("vet456");
      expect(metadata.caseNumber).toBe("case789");
      expect(metadata.captureDate).toBeInstanceOf(Date);
    });
  });

  describe("configuration validation", () => {
    it("should validate correct config", () => {
      const config: UploadConfig = {
        allowedTypes: ["image/jpeg", "image/png"],
        autoGenerateThumbnails: true,
        compressionQuality: 0.8,
        maxFileSize: 5 * 1024 * 1024,
        maxFiles: 10,
        requireMedicalCompliance: true,
      };

      expect(() => PhotoUploadService.validateConfig(config)).not.toThrow();
    });

    it("should throw error for invalid maxFileSize", () => {
      const config = {
        allowedTypes: ["image/jpeg"],
        autoGenerateThumbnails: true,
        compressionQuality: 0.8,
        maxFileSize: 0,
        maxFiles: 10,
        requireMedicalCompliance: false,
      };

      expect(() => PhotoUploadService.validateConfig(config)).toThrow(
        "maxFileSize must be greater than 0",
      );
    });

    it("should throw error for invalid maxFiles", () => {
      const config = {
        allowedTypes: ["image/jpeg"],
        autoGenerateThumbnails: true,
        compressionQuality: 0.8,
        maxFileSize: 1024 * 1024,
        maxFiles: 0,
        requireMedicalCompliance: false,
      };

      expect(() => PhotoUploadService.validateConfig(config)).toThrow(
        "maxFiles must be greater than 0",
      );
    });

    it("should throw error for invalid compression quality", () => {
      const config = {
        allowedTypes: ["image/jpeg"],
        autoGenerateThumbnails: true,
        compressionQuality: 1.5, // Invalid
        maxFileSize: 1024 * 1024,
        maxFiles: 10,
        requireMedicalCompliance: false,
      };

      expect(() => PhotoUploadService.validateConfig(config)).toThrow(
        "compressionQuality must be between 0 and 1",
      );
    });

    it("should throw error for empty allowed types", () => {
      const config = {
        allowedTypes: [],
        autoGenerateThumbnails: true,
        compressionQuality: 0.8,
        maxFileSize: 1024 * 1024,
        maxFiles: 10,
        requireMedicalCompliance: false,
      };

      expect(() => PhotoUploadService.validateConfig(config)).toThrow(
        "allowedTypes cannot be empty",
      );
    });
  });

  describe("medical compliance validation", () => {
    it("should accept medical image formats", () => {
      const config: UploadConfig = {
        allowedTypes: ["image/jpeg", "image/tiff", "image/png"],
        autoGenerateThumbnails: true,
        compressionQuality: 0.85,
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 20,
        requireMedicalCompliance: true,
      };

      const medicalFile = createMockFile({
        name: "CASE001_chest_PA.tiff",
        size: 5 * 1024 * 1024, // 5MB
        type: "image/tiff",
      });

      const result = PhotoUploadService.validateFile(medicalFile, config);

      expect(result.isValid).toBe(true);
      expect(result.medicalCompliance.isCompliant).toBe(true);
    });

    it("should validate medical file naming patterns", () => {
      const validNames = [
        "CASE001_abdomen_lateral.jpg",
        "VET123_surgery_before.png",
        "2024-01-15_examination.jpg",
        "CAT001_chest_xray.tiff",
      ];

      validNames.forEach((name) => {
        const file = createMockFile({ name });
        const result = PhotoUploadService.validateFile(file);

        expect(result.warnings).not.toContain(
          expect.stringContaining("naming convention"),
        );
      });
    });

    it("should warn about non-medical naming", () => {
      const invalidNames = ["photo.jpg", "image123.png", "vacation_pic.jpg"];

      invalidNames.forEach((name) => {
        const file = createMockFile({ name });
        const result = PhotoUploadService.validateFile(file);

        expect(
          result.warnings.some((w) => w.includes("naming convention")),
        ).toBe(true);
      });
    });
  });
});
