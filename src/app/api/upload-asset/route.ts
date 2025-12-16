import { NextRequest, NextResponse } from "next/server";
import { uploadAsset } from "@/lib/lyzr/upload";
import dbConnect from "@/lib/db";
import Organization from "@/models/organization";
import User from "@/models/user";
import { decrypt } from "@/lib/encryption";

interface AssetResult {
    success: boolean;
    asset_id: string;
    file_name: string;
    type: string;
    url: string;
}

export async function POST(request: NextRequest) {
    await dbConnect();

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const organizationId = formData.get("organizationId") as string;

        console.log('📎 Upload asset request received:', {
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size,
            organizationId,
        });

        if (!file) {
            console.error('❌ No file provided in upload request');
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        if (!organizationId) {
            console.error('❌ No organizationId provided in upload request');
            return NextResponse.json(
                { error: "Organization ID is required" },
                { status: 400 }
            );
        }

        // Get organization to find the owner
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            console.error('❌ Organization not found:', organizationId);
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Get owner's API key (same pattern as chat stream route)
        const owner = await User.findById(organization.ownerId);
        if (!owner) {
            console.error('❌ Organization owner not found');
            return NextResponse.json(
                { error: "Organization owner not found" },
                { status: 404 }
            );
        }

        // Decrypt owner's API key
        const ownerApiKey = decrypt(owner.lyzrApiKey);

        console.log('📤 Uploading to Lyzr Asset API using owner API key...');
        const result = await uploadAsset(ownerApiKey, file);
        console.log('✅ Lyzr upload response:', result);

        // Extract asset_id from results array
        const assetIds = result.results?.map((r: AssetResult) => r.asset_id).filter(Boolean) || [];
        console.log('📎 Extracted asset IDs:', assetIds);

        return NextResponse.json({
            assetIds,
            success: true,
        });
    } catch (error) {
        console.error("❌ Error uploading asset:", error);
        console.error("Error details:", error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            {
                error: "Failed to upload asset",
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
