/**
 * S3 Image Utilities
 * Helper functions for managing S3 image URLs and access
 */

/**
 * Extract S3 key from full S3 URL
 * @param url - Full S3 URL
 * @returns S3 key (path within bucket)
 */
export function extractS3Key(url: string): string | null {
	try {
		// Pattern: https://bucket-name.s3.region.amazonaws.com/key
		const s3Pattern = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/;
		const match = url.match(s3Pattern);
		return match ? match[1] : null;
	} catch (error) {
		console.error("Error extracting S3 key:", error);
		return null;
	}
}

/**
 * Check if URL is an S3 URL
 * @param url - URL to check
 * @returns true if it's an S3 URL
 */
export function isS3Url(url: string): boolean {
	return url.includes(".s3.") && url.includes(".amazonaws.com");
}

/**
 * Get signed URL for private S3 image
 * @param s3Url - Direct S3 URL
 * @returns Signed URL that works with private buckets
 */
export async function getSignedImageUrl(s3Url: string): Promise<string> {
	try {
		const key = extractS3Key(s3Url);
		if (!key) {
			throw new Error("Invalid S3 URL");
		}

		const response = await fetch(`/api/get-image?key=${encodeURIComponent(key)}`);
		if (!response.ok) {
			throw new Error("Failed to get signed URL");
		}

		const data = await response.json();
		return data.url;
	} catch (error) {
		console.error("Error getting signed URL:", error);
		// Fallback to original URL
		return s3Url;
	}
}

/**
 * Convert editor content to use presigned URLs for all S3 images
 * Use this when displaying content to users (frontend rendering)
 * Converts direct S3 URLs to presigned URLs for secure access
 * @param content - TipTap JSON content with direct S3 URLs
 * @returns Content with presigned URLs
 */
export async function convertToSignedUrls(content: any): Promise<any> {
	if (!content) return content;

	const processNode = async (node: any): Promise<any> => {
		// Process image nodes
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;

			// If it's a direct S3 URL (not already presigned), convert to presigned URL
			if (isS3Url(src) && !src.includes('X-Amz-Signature')) {
				try {
					node.attrs.src = await getSignedImageUrl(src);
					console.log("🔐 Converted to presigned URL for display");
				} catch (error) {
					console.error("Failed to convert to signed URL:", error);
					// Keep original URL as fallback
				}
			}
		}

		// Recursively process child nodes
		if (node.content && Array.isArray(node.content)) {
			for (let i = 0; i < node.content.length; i++) {
				node.content[i] = await processNode(node.content[i]);
			}
		}

		return node;
	};

	return await processNode({ ...content });
}

/**
 * Upload image to S3 via API and get direct S3 URL
 * Returns direct S3 URL (not presigned) for storage in database
 * Use getSignedImageUrl() to get presigned URL when displaying
 * @param base64Image - Base64 encoded image
 * @param fileName - Optional custom filename
 * @returns Direct S3 URL (store this in database)
 */
export async function uploadImageToS3(
	base64Image: string,
	fileName?: string
): Promise<string> {
	const response = await fetch("/api/upload-image", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ image: base64Image, fileName }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to upload image");
	}

	const data = await response.json();
	// Returns direct S3 URL (not presigned)
	// Store this in your database
	return data.url;
}

/**
 * Delete a single image from S3
 * @param url - S3 URL or key
 * @returns true if deletion was successful
 */
export async function deleteImageFromS3(url: string): Promise<boolean> {
	try {
		const response = await fetch("/api/delete-image", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete image");
		}

		console.log("🗑️ Image deleted from S3:", url);
		return true;
	} catch (error) {
		console.error("❌ Error deleting image:", error);
		return false;
	}
}

/**
 * Delete multiple images from S3
 * @param urls - Array of S3 URLs or keys
 * @returns Object with success count and results
 */
export async function batchDeleteImages(
	urls: string[]
): Promise<{ succeeded: number; failed: number; results: any[] }> {
	try {
		const response = await fetch("/api/delete-image", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ urls }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete images");
		}

		const data = await response.json();
		console.log(
			`🗑️ Batch delete complete: ${data.summary.succeeded} succeeded, ${data.summary.failed} failed`
		);
		return {
			succeeded: data.summary.succeeded,
			failed: data.summary.failed,
			results: data.results,
		};
	} catch (error) {
		console.error("❌ Error in batch delete:", error);
		return { succeeded: 0, failed: urls.length, results: [] };
	}
}

/**
 * Compare two editor contents and find removed S3 images
 * @param oldContent - Previous editor content
 * @param newContent - Current editor content
 * @returns Array of S3 URLs that were removed
 */
export function findRemovedImages(oldContent: any, newContent: any): string[] {
	if (!oldContent) return [];

	const extractS3Images = (content: any): Set<string> => {
		const images = new Set<string>();

		const traverse = (node: any) => {
			if (node.type === "image" && node.attrs?.src) {
				const src = node.attrs.src;
				// Only track S3 URLs (not base64 or external URLs)
				if (isS3Url(src)) {
					images.add(src);
				}
			}

			if (node.content && Array.isArray(node.content)) {
				node.content.forEach(traverse);
			}
		};

		traverse(content);
		return images;
	};

	const oldImages = extractS3Images(oldContent);
	const newImages = extractS3Images(newContent);

	// Find images that were in old content but not in new content
	const removedImages: string[] = [];
	oldImages.forEach((url) => {
		if (!newImages.has(url)) {
			removedImages.push(url);
		}
	});

	return removedImages;
}

/**
 * Clean up removed images from S3
 * Compares old and new content, deletes images that were removed
 * @param oldContent - Previous editor content
 * @param newContent - Current editor content
 * @returns Number of images deleted
 */
export async function cleanupRemovedImages(
	oldContent: any,
	newContent: any
): Promise<number> {
	const removedImages = findRemovedImages(oldContent, newContent);

	if (removedImages.length === 0) {
		return 0;
	}

	console.log(`🗑️ Found ${removedImages.length} removed images, deleting from S3...`);

	const result = await batchDeleteImages(removedImages);
	return result.succeeded;
}
