import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
 * GET endpoint to retrieve a presigned URL for secure image access
 * Usage: /api/get-image?key=editor-images/filename.png&expiresIn=3600
 */
export async function GET(request: NextRequest) {
	try {
		const { bucketName } = validateEnvVars();
		const s3Client = getS3Client();

		const { searchParams } = new URL(request.url);
		const key = searchParams.get("key");
		const expiresInParam = searchParams.get("expiresIn");

		if (!key) {
			return NextResponse.json(
				{ error: "Image key is required" },
				{ status: 400 }
			);
		}

		// Default to 7 days, allow custom expiration
		const expiresIn = expiresInParam 
			? parseInt(expiresInParam) 
			: 7 * 24 * 60 * 60; // 7 days

		// Generate a presigned URL
		const command = new GetObjectCommand({
			Bucket: bucketName,
			Key: key,
		});

		const signedUrl = await getSignedUrl(s3Client, command, {
			expiresIn,
		});

		console.log("✅ Generated signed URL for:", key, `(expires in ${expiresIn}s)`);

		return NextResponse.json({ 
			url: signedUrl,
			key,
			expiresIn
		}, { status: 200 });
	} catch (error: any) {
		console.error("❌ Error generating signed URL:", error);
		
		return NextResponse.json(
			{ 
				error: error.message || "Failed to generate signed URL",
				details: error.Code || error.name || "Unknown error"
			},
			{ status: 500 }
		);
	}
}
