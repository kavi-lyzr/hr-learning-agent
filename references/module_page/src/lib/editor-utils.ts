/**
 * Utility functions for processing TipTap editor content
 */

import { uploadImageToS3 } from "./s3-utils";

/**
 * Process TipTap JSON content and upload base64 images to S3
 * Converts base64 images to direct S3 URLs (not presigned)
 * Store the returned content in your database
 * Use convertToSignedUrls() when displaying to users
 * @param content - TipTap JSON content
 * @returns Processed content with direct S3 URLs (for storage)
 */
export async function processEditorImages(content: any): Promise<any> {
	if (!content) return content;

	const processNode = async (node: any): Promise<any> => {
		// Process image nodes
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;

			const fileName = `l&d-image-${Date.now()}.png`;

			// Check if it's a base64 image
			if (src.startsWith("data:image")) {
				try {
					// Upload to S3 and get direct URL (not presigned)
					const directUrl = await uploadImageToS3(src, fileName);
					node.attrs.src = directUrl;
					console.log("✅ Image uploaded to S3:", directUrl);
				} catch (error: any) {
					console.error("❌ Failed to upload image:", error.message || error);
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
 * Check if editor content contains any base64 images
 * @param content - TipTap JSON content
 * @returns true if base64 images found
 */
export function hasBase64Images(content: any): boolean {
	if (!content) return false;

	const checkNode = (node: any): boolean => {
		if (node.type === "image" && node.attrs?.src?.startsWith("data:image")) {
			return true;
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.some((child: any) => checkNode(child));
		}

		return false;
	};

	return checkNode(content);
}

/**
 * Extract all image URLs from editor content
 * @param content - TipTap JSON content
 * @returns Array of image URLs
 */
export function extractImageUrls(content: any): string[] {
	if (!content) return [];

	const urls: string[] = [];

	const extractFromNode = (node: any) => {
		if (node.type === "image" && node.attrs?.src) {
			urls.push(node.attrs.src);
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach((child: any) => extractFromNode(child));
		}
	};

	extractFromNode(content);
	return urls;
}

/**
 * Estimate the size of base64 images in content
 * @param content - TipTap JSON content
 * @returns Size in bytes
 */
export function estimateBase64ImageSize(content: any): number {
	if (!content) return 0;

	let totalSize = 0;

	const calculateSize = (node: any) => {
		if (node.type === "image" && node.attrs?.src?.startsWith("data:image")) {
			// Base64 size estimation: (length * 3/4) - padding
			const base64String = node.attrs.src.split(",")[1] || "";
			totalSize += (base64String.length * 3) / 4;
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach((child: any) => calculateSize(child));
		}
	};

	calculateSize(content);
	return Math.round(totalSize);
}
