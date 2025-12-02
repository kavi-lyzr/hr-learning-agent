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

/**
 * Construct YouTube URL from video ID
 */
function constructYouTubeUrl(videoId: string): string {
	return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Fetch transcript using the new FastAPI service (primary method)
 */
async function fetchTranscriptFromApi(videoUrl: string): Promise<{
	videoId: string;
	transcript: string;
	cached: boolean;
	language: string;
} | null> {
	const apiUrl = process.env.YOUTUBE_TRANSCRIPT_API_URL;
	const apiKey = process.env.YOUTUBE_TRANSCRIPT_API_KEY;

	if (!apiUrl || !apiKey) {
		console.warn("YouTube Transcript API credentials not configured, will use fallback method");
		return null;
	}

	try {
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
	} catch (error) {
		console.error("Error fetching from FastAPI service:", error);
		return null;
	}
}

/**
 * Fetch transcript using the old library (fallback method)
 */
async function fetchTranscriptFromLibrary(videoId: string): Promise<{
	videoId: string;
	transcript: any[];
} | null> {
	try {
		const api = new YouTubeTranscriptApi();
		const transcript = await api.fetch(videoId);

		return {
			videoId: transcript.videoId,
			transcript: transcript.snippets.map((snippet: any) => ({
				text: snippet.text,
				start: snippet.start,
				duration: snippet.duration,
			})),
		};
	} catch (error) {
		console.error("Error fetching from library:", error);
		return null;
	}
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

		// Try the new FastAPI service first
		const apiResult = await fetchTranscriptFromApi(videoUrl);
		if (apiResult) {
			return NextResponse.json({
				videoId: apiResult.videoId,
				transcript: apiResult.transcript,
				cached: apiResult.cached,
				language: apiResult.language,
				source: 'api',
			});
		}

		// Fallback to the old library
		console.log("Falling back to library method for video:", videoId);
		const libraryResult = await fetchTranscriptFromLibrary(videoId);
		if (libraryResult) {
			return NextResponse.json({
				videoId: libraryResult.videoId,
				transcript: libraryResult.transcript,
				source: 'library',
			});
		}

		// Both methods failed
		return NextResponse.json(
			{ error: "Failed to fetch transcript from both API and library" },
			{ status: 500 }
		);
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

		// Try the new FastAPI service first
		const apiResult = await fetchTranscriptFromApi(videoUrl);
		if (apiResult) {
			return NextResponse.json({
				videoId: apiResult.videoId,
				transcript: apiResult.transcript,
				cached: apiResult.cached,
				language: apiResult.language,
				source: 'api',
			});
		}

		// Fallback to the old library
		console.log("Falling back to library method for video:", videoId);
		const libraryResult = await fetchTranscriptFromLibrary(videoId);
		if (libraryResult) {
			return NextResponse.json({
				videoId: libraryResult.videoId,
				transcript: libraryResult.transcript,
				source: 'library',
			});
		}

		// Both methods failed
		return NextResponse.json(
			{ error: "Failed to fetch transcript from both API and library" },
			{ status: 500 }
		);
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
