import { NextRequest, NextResponse } from "next/server";
import { YouTubeTranscriptApi } from "@playzone/youtube-transcript/dist/api/index";

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
		/youtube\.com\/embed\/([^&\n?#]+)/,
		/youtube\.com\/v\/([^&\n?#]+)/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	// If it's already just an ID
	if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
		return url;
	}

	return null;
}

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
			transcript: transcript.snippets.map((snippet: any) => ({
				text: snippet.text,
				start: snippet.start,
				duration: snippet.duration,
			})),
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

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { videoUrl } = body;

		if (!videoUrl) {
			return NextResponse.json(
				{ error: "Video URL is required" },
				{ status: 400 }
			);
		}

		// Extract video ID from URL
		const videoId = extractVideoId(videoUrl);
		if (!videoId) {
			return NextResponse.json(
				{ error: "Invalid YouTube URL" },
				{ status: 400 }
			);
		}

		const api = new YouTubeTranscriptApi();
		const transcript = await api.fetch(videoId);

		return NextResponse.json({
			videoId: transcript.videoId,
			transcript: transcript.snippets.map((snippet: any) => ({
				text: snippet.text,
				start: snippet.start,
				duration: snippet.duration,
			})),
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
