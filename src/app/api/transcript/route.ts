import { NextRequest, NextResponse } from "next/server";

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

/**
 * Construct YouTube URL from video ID
 */
function constructYouTubeUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Fetch transcript using the FastAPI service
 */
async function fetchTranscriptFromApi(videoUrl: string): Promise<{
	videoId: string;
	transcript: string;
	cached: boolean;
	language: string;
}> {
	const apiUrl = process.env.YOUTUBE_TRANSCRIPT_API_URL;
	const apiKey = process.env.YOUTUBE_TRANSCRIPT_API_KEY;

	if (!apiUrl || !apiKey) {
		throw new Error("YouTube Transcript API credentials not configured");
	}

	const response = await fetch(`${apiUrl}/api/v1/youtube/transcript`, {
		method: 'POST',
		headers: {
			'X-API-KEY': apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ url: videoUrl }),
	});

	if (!response.ok) {
		if (response.status === 404) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Transcript not found for this video");
		}
		throw new Error(`API returned status ${response.status}`);
	}

	const data = await response.json();
	return {
		videoId: data.video_id,
		transcript: data.transcript,
		cached: data.cached,
		language: data.language,
	};
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

		// Construct YouTube URL from video ID
		const videoUrl = constructYouTubeUrl(videoId);

		// Fetch transcript from API
		const result = await fetchTranscriptFromApi(videoUrl);
		return NextResponse.json({
			videoId: result.videoId,
			transcript: result.transcript,
			cached: result.cached,
			language: result.language,
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

		// Fetch transcript from API
		const result = await fetchTranscriptFromApi(videoUrl);
		return NextResponse.json({
			videoId: result.videoId,
			transcript: result.transcript,
			cached: result.cached,
			language: result.language,
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
