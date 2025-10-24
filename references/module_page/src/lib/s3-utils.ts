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
 * Upload image to S3 and get full metadata
 * @param base64Image - Base64 encoded image
 * @param fileName - Optional custom filename
 * @returns Object with direct S3 URL, key, bucket, and region
 */
export async function uploadImageToS3WithMetadata(
	base64Image: string,
	fileName?: string
): Promise<{
	url: string;      // Direct S3 URL (not presigned)
	key: string;      // S3 object key
	bucket: string;   // Bucket name
	region: string;   // AWS region
}> {
	const response = await fetch("/api/upload-image", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ image: base64Image, fileName }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to upload image");
	}

	return await response.json();
}

/**
 * Batch upload multiple images to S3
 * @param images - Array of base64 images
 * @returns Array of S3 URLs
 */
export async function batchUploadImages(
	images: string[]
): Promise<string[]> {
	const uploadPromises = images.map((image) => uploadImageToS3(image));
	return await Promise.all(uploadPromises);
}

/**
 * Get image metadata from S3 URL
 * @param url - S3 URL
 * @returns Metadata object
 */
export function getImageMetadata(url: string): {
	key: string | null;
	bucket: string | null;
	region: string | null;
	filename: string | null;
} {
	const key = extractS3Key(url);
	
	// Extract bucket and region from URL
	// Pattern: https://bucket-name.s3.region.amazonaws.com/key
	const urlPattern = /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com/;
	const match = url.match(urlPattern);
	
	const bucket = match ? match[1] : null;
	const region = match ? match[2] : null;
	const filename = key ? key.split("/").pop() || null : null;

	return { key, bucket, region, filename };
}

/**
 * Check if image exists (by attempting to fetch it)
 * @param url - Image URL
 * @returns true if image exists
 */
export async function imageExists(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { method: "HEAD" });
		return response.ok;
	} catch (error) {
		return false;
	}
}

/**
 * Refresh presigned URL for an S3 object
 * Useful when URLs are about to expire
 * @param key - S3 object key
 * @returns New presigned URL
 */
export async function refreshPresignedUrl(key: string): Promise<string> {
	try {
		const response = await fetch(`/api/get-image?key=${encodeURIComponent(key)}`);
		if (!response.ok) {
			throw new Error("Failed to refresh presigned URL");
		}

		const data = await response.json();
		return data.url;
	} catch (error) {
		console.error("Error refreshing presigned URL:", error);
		throw error;
	}
}

/**
 * Check if a presigned URL is expired or about to expire
 * @param url - Presigned URL
 * @returns true if expired or expiring soon (within 1 hour)
 */
export function isPresignedUrlExpiring(url: string): boolean {
	try {
		const urlObj = new URL(url);
		const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
		const dateParam = urlObj.searchParams.get('X-Amz-Date');
		
		if (!expiresParam || !dateParam) {
			// Not a presigned URL, assume it's valid
			return false;
		}

		const expiresInSeconds = parseInt(expiresParam);
		const signedDate = new Date(
			dateParam.substring(0, 4) + '-' +
			dateParam.substring(4, 6) + '-' +
			dateParam.substring(6, 8) + 'T' +
			dateParam.substring(9, 11) + ':' +
			dateParam.substring(11, 13) + ':' +
			dateParam.substring(13, 15) + 'Z'
		);

		const expirationDate = new Date(signedDate.getTime() + expiresInSeconds * 1000);
		const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

		return expirationDate < oneHourFromNow;
	} catch (error) {
		console.error("Error checking URL expiration:", error);
		return false;
	}
}

/**
 * Process editor content and refresh any expiring presigned URLs
 * @param content - TipTap JSON content
 * @returns Content with refreshed URLs
 */
export async function refreshExpiringUrls(content: any): Promise<any> {
	if (!content) return content;

	const processNode = async (node: any): Promise<any> => {
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;
			
			// Check if it's a presigned URL that's expiring
			if (isPresignedUrlExpiring(src)) {
				try {
					const key = extractS3Key(src);
					if (key) {
						console.log("🔄 Refreshing expiring presigned URL for:", key);
						node.attrs.src = await refreshPresignedUrl(key);
						console.log("✅ URL refreshed successfully");
					}
				} catch (error) {
					console.error("Failed to refresh URL:", error);
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
