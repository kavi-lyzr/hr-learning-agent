export async function uploadAsset(
    lyzrApiKey: string,
    file: File
) {
    try {
        const formData = new FormData();
        formData.append("files", file);

        const response = await fetch(
            "https://agent-prod.studio.lyzr.ai/v3/assets/upload",
            {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "x-api-key": lyzrApiKey,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error uploading asset:", error);
        throw new Error("Failed to upload file");
    }
}
