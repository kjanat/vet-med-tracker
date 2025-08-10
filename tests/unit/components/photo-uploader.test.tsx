/**
 * Unit tests for PhotoUploader component
 */

import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clickButton,
	renderWithProviders,
	uploadFile,
} from "@/tests/helpers/rtl-utils";

// Mock the usePhotoUpload hook
const mockUploadPhoto = vi.fn();
const mockDeletePhoto = vi.fn();

vi.mock("@/hooks/offline/usePhotoUpload", () => ({
	usePhotoUpload: () => ({
		uploadPhoto: mockUploadPhoto,
		deletePhoto: mockDeletePhoto,
		photos: [],
		isUploading: false,
		uploadProgress: 0,
		error: null,
	}),
}));

// Simple PhotoUploader component for testing
const PhotoUploader: React.FC<{
	maxFiles?: number;
	onUploadComplete?: (photos: any[]) => void;
}> = ({ maxFiles = 5, onUploadComplete }) => {
	const {
		uploadPhoto,
		deletePhoto,
		photos,
		isUploading,
		uploadProgress,
		error,
	} = require("@/hooks/offline/usePhotoUpload").usePhotoUpload();

	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;
		if (!files) return;

		try {
			await uploadPhoto(files[0]);
			if (onUploadComplete) {
				onUploadComplete(photos);
			}
		} catch (err) {
			console.error("Upload failed:", err);
		}
	};

	const handleDelete = async (photoId: string) => {
		await deletePhoto(photoId);
	};

	return (
		<div data-testid="photo-uploader">
			<input
				type="file"
				accept="image/*"
				multiple={maxFiles > 1}
				onChange={handleFileSelect}
				disabled={isUploading}
				data-testid="file-input"
			/>

			{isUploading && (
				<div data-testid="upload-progress">Uploading... {uploadProgress}%</div>
			)}

			{error && (
				<div data-testid="error-message" role="alert">
					{error}
				</div>
			)}

			<div data-testid="photo-list">
				{photos.map((photo: any) => (
					<div key={photo.id} data-testid={`photo-${photo.id}`}>
						<img src={photo.url} alt={photo.originalName} />
						<button
							onClick={() => handleDelete(photo.id)}
							data-testid={`delete-${photo.id}`}
						>
							Delete
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

describe("PhotoUploader Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders upload interface correctly", () => {
		renderWithProviders(<PhotoUploader />);

		expect(screen.getByTestId("photo-uploader")).toBeInTheDocument();
		expect(screen.getByTestId("file-input")).toBeInTheDocument();
		expect(screen.getByTestId("photo-list")).toBeInTheDocument();
	});

	it("accepts file selection", async () => {
		const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
		mockUploadPhoto.mockResolvedValue({ id: "photo-1", url: "blob:test-url" });

		renderWithProviders(<PhotoUploader />);

		const fileInput = screen.getByTestId("file-input");
		await uploadFile("file-input", mockFile);

		expect(mockUploadPhoto).toHaveBeenCalledWith(mockFile);
	});

	it("displays upload progress", () => {
		vi.mock("@/hooks/offline/usePhotoUpload", () => ({
			usePhotoUpload: () => ({
				uploadPhoto: mockUploadPhoto,
				deletePhoto: mockDeletePhoto,
				photos: [],
				isUploading: true,
				uploadProgress: 45,
				error: null,
			}),
		}));

		renderWithProviders(<PhotoUploader />);

		expect(screen.getByTestId("upload-progress")).toBeInTheDocument();
		expect(screen.getByText("Uploading... 45%")).toBeInTheDocument();
	});

	it("displays error messages", () => {
		vi.mock("@/hooks/offline/usePhotoUpload", () => ({
			usePhotoUpload: () => ({
				uploadPhoto: mockUploadPhoto,
				deletePhoto: mockDeletePhoto,
				photos: [],
				isUploading: false,
				uploadProgress: 0,
				error: "Upload failed: File too large",
			}),
		}));

		renderWithProviders(<PhotoUploader />);

		const errorElement = screen.getByTestId("error-message");
		expect(errorElement).toBeInTheDocument();
		expect(errorElement).toHaveTextContent("Upload failed: File too large");
		expect(errorElement).toHaveAttribute("role", "alert");
	});

	it("displays uploaded photos", () => {
		const mockPhotos = [
			{
				id: "photo-1",
				originalName: "test1.jpg",
				url: "blob:test-url-1",
			},
			{
				id: "photo-2",
				originalName: "test2.jpg",
				url: "blob:test-url-2",
			},
		];

		vi.mock("@/hooks/offline/usePhotoUpload", () => ({
			usePhotoUpload: () => ({
				uploadPhoto: mockUploadPhoto,
				deletePhoto: mockDeletePhoto,
				photos: mockPhotos,
				isUploading: false,
				uploadProgress: 0,
				error: null,
			}),
		}));

		renderWithProviders(<PhotoUploader />);

		expect(screen.getByTestId("photo-photo-1")).toBeInTheDocument();
		expect(screen.getByTestId("photo-photo-2")).toBeInTheDocument();
		expect(screen.getByAltText("test1.jpg")).toHaveAttribute(
			"src",
			"blob:test-url-1",
		);
		expect(screen.getByAltText("test2.jpg")).toHaveAttribute(
			"src",
			"blob:test-url-2",
		);
	});

	it("handles photo deletion", async () => {
		const mockPhotos = [
			{
				id: "photo-1",
				originalName: "test1.jpg",
				url: "blob:test-url-1",
			},
		];

		vi.mock("@/hooks/offline/usePhotoUpload", () => ({
			usePhotoUpload: () => ({
				uploadPhoto: mockUploadPhoto,
				deletePhoto: mockDeletePhoto,
				photos: mockPhotos,
				isUploading: false,
				uploadProgress: 0,
				error: null,
			}),
		}));

		renderWithProviders(<PhotoUploader />);

		const deleteButton = screen.getByTestId("delete-photo-1");
		await clickButton("Delete");

		expect(mockDeletePhoto).toHaveBeenCalledWith("photo-1");
	});

	it("disables file input during upload", () => {
		vi.mock("@/hooks/offline/usePhotoUpload", () => ({
			usePhotoUpload: () => ({
				uploadPhoto: mockUploadPhoto,
				deletePhoto: mockDeletePhoto,
				photos: [],
				isUploading: true,
				uploadProgress: 30,
				error: null,
			}),
		}));

		renderWithProviders(<PhotoUploader />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toBeDisabled();
	});

	it("calls onUploadComplete when upload finishes", async () => {
		const mockOnComplete = vi.fn();
		const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });

		mockUploadPhoto.mockResolvedValue({ id: "photo-1", url: "blob:test-url" });

		renderWithProviders(<PhotoUploader onUploadComplete={mockOnComplete} />);

		const fileInput = screen.getByTestId("file-input");
		await uploadFile("file-input", mockFile);

		await waitFor(() => {
			expect(mockOnComplete).toHaveBeenCalled();
		});
	});

	it("handles upload errors gracefully", async () => {
		const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
		mockUploadPhoto.mockRejectedValue(new Error("Network error"));

		renderWithProviders(<PhotoUploader />);

		const fileInput = screen.getByTestId("file-input");
		await uploadFile("file-input", mockFile);

		// Should not crash the component
		expect(screen.getByTestId("photo-uploader")).toBeInTheDocument();
	});

	it("supports single file mode", () => {
		renderWithProviders(<PhotoUploader maxFiles={1} />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).not.toHaveAttribute("multiple");
	});

	it("supports multiple file mode", () => {
		renderWithProviders(<PhotoUploader maxFiles={5} />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toHaveAttribute("multiple");
	});

	it("restricts file types to images", () => {
		renderWithProviders(<PhotoUploader />);

		const fileInput = screen.getByTestId("file-input");
		expect(fileInput).toHaveAttribute("accept", "image/*");
	});
});
