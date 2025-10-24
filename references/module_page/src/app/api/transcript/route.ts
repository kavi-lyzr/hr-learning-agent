import { NextRequest, NextResponse } from "next/server";
import { YouTubeTranscriptApi } from "@playzone/youtube-transcript/dist/api/index";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const videoId = searchParams.get("videoId");

		if (!videoId) {
			return NextResponse.json(
				{ error: "Video ID is required" },
				{ status: 400 }
			);
		}

		const api = new YouTubeTranscriptApi();
		const transcript = await api.fetch(videoId);

		return NextResponse.json({
			videoId: transcript.videoId,
			snippets: transcript.snippets,
		});
	} catch (error) {
		console.error("Error fetching transcript:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Failed to fetch transcript",
			},
			{ status: 500 }
		);
	}
}
