/**
 * Image URL Workflow Utilities
 * Handles the complete workflow: storage (direct URLs) → display (presigned URLs)
 */

import { convertToSignedUrls } from "./s3-utils";
import { processEditorImages } from "./editor-utils";

/**
 * STORAGE WORKFLOW
 * Prepare content for database storage
 * Converts base64 images to direct S3 URLs
 * 
 * @param content - Editor content with base64 images
 * @returns Content with direct S3 URLs (ready for database)
 * 
 * @example
 * const contentToStore = await prepareContentForStorage(editorContent);
 * await database.save({ content: contentToStore });
 */
export async function prepareContentForStorage(content: any): Promise<any> {
	console.log("📦 Preparing content for storage...");
	const processed = await processEditorImages(content);
	console.log("✅ Content ready for storage (direct S3 URLs)");
	return processed;
}

/**
 * DISPLAY WORKFLOW
 * Prepare content for frontend display
 * Converts direct S3 URLs to presigned URLs
 * 
 * @param content - Database content with direct S3 URLs
 * @returns Content with presigned URLs (ready for display)
 * 
 * @example
 * const dbContent = await database.get(id);
 * const contentToDisplay = await prepareContentForDisplay(dbContent.content);
 * editor.setContent(contentToDisplay);
 */
export async function prepareContentForDisplay(content: any): Promise<any> {
	console.log("🖼️ Preparing content for display...");
	const withPresignedUrls = await convertToSignedUrls(content);
	console.log("✅ Content ready for display (presigned URLs)");
	return withPresignedUrls;
}

/**
 * Check if content has direct S3 URLs (not presigned)
 * @param content - Content to check
 * @returns true if content has direct S3 URLs
 */
export function hasDirectS3Urls(content: any): boolean {
	if (!content) return false;

	const checkNode = (node: any): boolean => {
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;
			// Check if it's an S3 URL but NOT presigned
			return src.includes('.s3.') && 
			       src.includes('.amazonaws.com') && 
			       !src.includes('X-Amz-Signature');
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.some((child: any) => checkNode(child));
		}

		return false;
	};

	return checkNode(content);
}

/**
 * Check if content has presigned S3 URLs
 * @param content - Content to check
 * @returns true if content has presigned URLs
 */
export function hasPresignedUrls(content: any): boolean {
	if (!content) return false;

	const checkNode = (node: any): boolean => {
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;
			return src.includes('X-Amz-Signature');
		}

		if (node.content && Array.isArray(node.content)) {
			return node.content.some((child: any) => checkNode(child));
		}

		return false;
	};

	return checkNode(content);
}

/**
 * Get image statistics from content
 * @param content - Content to analyze
 * @returns Statistics about images in content
 */
export function getImageStats(content: any): {
	totalImages: number;
	directUrls: number;
	presignedUrls: number;
	base64Images: number;
	externalUrls: number;
} {
	const stats = {
		totalImages: 0,
		directUrls: 0,
		presignedUrls: 0,
		base64Images: 0,
		externalUrls: 0,
	};

	if (!content) return stats;

	const analyzeNode = (node: any) => {
		if (node.type === "image" && node.attrs?.src) {
			const src = node.attrs.src;
			stats.totalImages++;

			if (src.startsWith("data:image")) {
				stats.base64Images++;
			} else if (src.includes('X-Amz-Signature')) {
				stats.presignedUrls++;
			} else if (src.includes('.s3.') && src.includes('.amazonaws.com')) {
				stats.directUrls++;
			} else {
				stats.externalUrls++;
			}
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach((child: any) => analyzeNode(child));
		}
	};

	analyzeNode(content);
	return stats;
}

/**
 * COMPLETE WORKFLOW EXAMPLE
 * 
 * // 1. SAVING TO DATABASE
 * const editorContent = editor.getJSON();
 * const contentToStore = await prepareContentForStorage(editorContent);
 * await database.save({ 
 *   content: contentToStore  // Contains direct S3 URLs
 * });
 * 
 * // 2. LOADING FROM DATABASE FOR DISPLAY
 * const record = await database.get(id);
 * const contentToDisplay = await prepareContentForDisplay(record.content);
 * editor.setContent(contentToDisplay);  // Images display with presigned URLs
 * 
 * // 3. UPDATING CONTENT
 * const updatedContent = editor.getJSON();
 * const contentToStore = await prepareContentForStorage(updatedContent);
 * await database.update(id, { content: contentToStore });
 */
