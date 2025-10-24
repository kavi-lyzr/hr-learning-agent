import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Validate environment variables
const validateEnvVars = () => {
	const required = {
		AWS_REGION: process.env.AWS_REGION,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
	};

	const missing = Object.entries(required)
		.filter(([_, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
	}

	return {
		region: required.AWS_REGION!,
		accessKeyId: required.AWS_ACCESS_KEY_ID!,
		secretAccessKey: required.AWS_SECRET_ACCESS_KEY!,
		bucketName: required.AWS_S3_BUCKET_NAME!,
	};
};

// Configure AWS S3 Client
const getS3Client = () => {
	const { region, accessKeyId, secretAccessKey } = validateEnvVars();
	
	return new S3Client({
		region,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
};

/**
 * DELETE endpoint to remove an image from S3
 * Usage: DELETE /api/delete-image with body { key: "editor-images/filename.png" }
 * Or: DELETE /api/delete-image with body { url: "https://bucket.s3.region.amazonaws.com/key" }
 */
export async function DELETE(request: NextRequest) {
	try {
		const { bucketName } = validateEnvVars();
		const s3Client = getS3Client();

		const body = await request.json();
		let key = body.key;

		// If URL is provided instead of key, extract the key
		if (!key && body.url) {
			const url = body.url;
			// Extract key from S3 URL pattern: https://bucket.s3.region.amazonaws.com/key
			const s3Pattern = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/;
			const match = url.match(s3Pattern);
			key = match ? match[1] : null;
		}

		if (!key) {
			return NextResponse.json(
				{ error: "Image key or URL is required" },
				{ status: 400 }
			);
		}

		// Delete the object from S3
		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		await s3Client.send(command);

		console.log("🗑️ Image deleted successfully from S3:", key);

		return NextResponse.json({ 
			success: true,
			key,
			message: "Image deleted successfully"
		}, { status: 200 });
	} catch (error: any) {
		console.error("❌ Error deleting image from S3:", error);
		
		return NextResponse.json(
			{ 
				error: error.message || "Failed to delete image",
				details: error.Code || error.name || "Unknown error"
			},
			{ status: 500 }
		);
	}
}

/**
 * POST endpoint to delete multiple images from S3
 * Usage: POST /api/delete-image with body { keys: ["key1", "key2"] } or { urls: ["url1", "url2"] }
 */
export async function POST(request: NextRequest) {
	try {
		const { bucketName } = validateEnvVars();
		const s3Client = getS3Client();

		const body = await request.json();
		let keys = body.keys || [];

		// If URLs are provided instead of keys, extract the keys
		if (keys.length === 0 && body.urls && Array.isArray(body.urls)) {
			const s3Pattern = /https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/;
			keys = body.urls
				.map((url: string) => {
					const match = url.match(s3Pattern);
					return match ? match[1] : null;
				})
				.filter((key: string | null) => key !== null);
		}

		if (keys.length === 0) {
			return NextResponse.json(
				{ error: "At least one image key or URL is required" },
				{ status: 400 }
			);
		}

		// Delete all images
		const deletePromises = keys.map(async (key: string) => {
			try {
				const command = new DeleteObjectCommand({
					Bucket: bucketName,
					Key: key,
				});
				await s3Client.send(command);
				console.log("🗑️ Image deleted:", key);
				return { key, success: true };
			} catch (error: any) {
				console.error("❌ Failed to delete:", key, error);
				return { key, success: false, error: error.message };
			}
		});

		const results = await Promise.all(deletePromises);
		const successCount = results.filter(r => r.success).length;
		const failureCount = results.filter(r => !r.success).length;

		console.log(`🗑️ Batch delete complete: ${successCount} succeeded, ${failureCount} failed`);

		return NextResponse.json({ 
			success: true,
			results,
			summary: {
				total: keys.length,
				succeeded: successCount,
				failed: failureCount
			}
		}, { status: 200 });
	} catch (error: any) {
		console.error("❌ Error in batch delete:", error);
		
		return NextResponse.json(
			{ 
				error: error.message || "Failed to delete images",
				details: error.Code || error.name || "Unknown error"
			},
			{ status: 500 }
		);
	}
}
