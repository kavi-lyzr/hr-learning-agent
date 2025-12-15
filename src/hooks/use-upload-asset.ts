import { useMutation } from "@tanstack/react-query";

interface UploadAssetResponse {
    assetIds: string[];
    success: boolean;
}

async function uploadAsset(file: File, organizationId: string): Promise<string[]> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("organizationId", organizationId);

    const response = await fetch("/api/upload-asset", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload asset");
    }

    const data: UploadAssetResponse = await response.json();
    return data.assetIds;
}

export function useUploadAsset() {
    return useMutation({
        mutationFn: ({ file, organizationId }: { file: File; organizationId: string }) =>
            uploadAsset(file, organizationId),
    });
}

export async function uploadMultipleAssets(files: File[], organizationId: string): Promise<string[]> {
    const allAssetIds: string[] = [];

    for (const file of files) {
        const assetIds = await uploadAsset(file, organizationId);
        allAssetIds.push(...assetIds);
    }

    return allAssetIds;
}
