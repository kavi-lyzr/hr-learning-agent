import { YouTubeTranscriptApi } from '@playzone/youtube-transcript/dist/api/index';

interface TranscriptSnippet {
    text: string;
    start: number;
    duration: number;
}

const TestPage = async () => {
    try {
        const api = new YouTubeTranscriptApi();
        const transcript = await api.fetch('R3g7sLaONFQ');
        
        const totalDuration = transcript.snippets.reduce((acc: number, item: TranscriptSnippet) => 
            Math.max(acc, item.start + item.duration), 0
        );
        const formattedDuration = new Date(totalDuration * 1000).toISOString().substr(11, 8);
        
        return (
            <div className="min-h-screen p-8 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">YouTube Transcript Test Page</h1>
                    
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Video Information</h2>
                        <div className="grid grid-cols-2 gap-4 text-gray-700">
                            <div>
                                <p className="text-sm text-gray-500">Video ID</p>
                                <p className="font-mono text-lg">{transcript.videoId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Segments</p>
                                <p className="text-2xl font-bold text-blue-600">{transcript.snippets.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Duration</p>
                                <p className="text-2xl font-bold text-blue-600">{formattedDuration}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Transcript</h2>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {transcript.snippets.map((snippet: TranscriptSnippet, index: number) => {
                                const timeInSeconds = snippet.start;
                                const minutes = Math.floor(timeInSeconds / 60);
                                const seconds = Math.floor(timeInSeconds % 60);
                                const timeStamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                
                                return (
                                    <div 
                                        key={index} 
                                        className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors rounded-r"
                                    >
                                        <div className="flex items-start gap-4">
                                            <span className="text-sm font-mono text-blue-600 font-semibold min-w-[60px]">
                                                {timeStamp}
                                            </span>
                                            <p className="text-gray-800 flex-1 leading-relaxed">{snippet.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800">
                            ✅ <strong>Success!</strong> Transcript loaded with {transcript.snippets.length} segments.
                        </p>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return (
            <div className="min-h-screen p-8 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-6 text-gray-900">YouTube Transcript Test Page</h1>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2 text-red-800">❌ Error Loading Transcript</h2>
                        <p className="text-red-700 mb-4">
                            {error instanceof Error ? error.message : 'An unknown error occurred'}
                        </p>
                        <div className="text-sm text-red-600">
                            <p className="font-semibold mb-2">Possible causes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Video does not have transcripts available</li>
                                <li>Video ID is invalid</li>
                                <li>Network connectivity issues</li>
                                <li>YouTube API rate limiting</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
};

export default TestPage;