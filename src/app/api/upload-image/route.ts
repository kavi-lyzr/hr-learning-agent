import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

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

// Configure AWS S3 Client with proper error handling
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

export async function POST(request: NextRequest) {
	try {
		// Validate environment variables first
		const { region, bucketName } = validateEnvVars();
		const s3Client = getS3Client();

		const { image, fileName } = await request.json();

		if (!image) {
			return NextResponse.json(
				{ error: "No image provided" },
				{ status: 400 }
			);
		}

		// Extract base64 data and mime type
		const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		if (!matches || matches.length !== 3) {
			return NextResponse.json(
				{ error: "Invalid base64 image format" },
				{ status: 400 }
			);
		}

		const mimeType = matches[1];
		const base64Data = matches[2];
		const buffer = Buffer.from(base64Data, "base64");

		// Generate unique filename
		const fileExtension = mimeType.split("/")[1];
		const uniqueFileName = fileName || `${uuidv4()}.${fileExtension}`;
		const key = uniqueFileName.includes('/') ? uniqueFileName : `editor-images/${uniqueFileName}`;

		// Upload to S3 with proper configuration
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: buffer,
			ContentType: mimeType,
		});

		await s3Client.send(command);

		// Generate the direct S3 URL (not presigned)
		// This is what you'll store in your database
		const directUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

		console.log("✅ Image uploaded successfully:", key);
		console.log("📎 Direct S3 URL:", directUrl);

		return NextResponse.json({
			url: directUrl,              // Direct S3 URL (store this)
			key: key,                    // S3 key
			bucket: bucketName,          // Bucket name
			region: region               // Region
		}, { status: 200 });
	} catch (error: any) {
		console.error("❌ Error uploading image to S3:", error);

		// Provide more detailed error information
		const errorMessage = error.message || "Failed to upload image";
		const errorDetails = error.Code || error.name || "Unknown error";

		return NextResponse.json(
			{
				error: errorMessage,
				details: errorDetails,
				hint: error.Code === 'AuthorizationHeaderMalformed'
					? "Check your AWS credentials in environment variables"
					: error.message?.includes("Missing required environment variables")
					? error.message
					: "Check AWS S3 configuration and permissions"
			},
			{ status: 500 }
		);
	}
}
