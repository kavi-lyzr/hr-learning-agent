'use client';

import { useState, useRef, useCallback } from 'react';
import { Streamdown } from 'streamdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function TestPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Endpoint selection
    const [endpointType, setEndpointType] = useState<'custom' | 'direct'>('custom');

    // Configuration - Update these values for testing
    const [config, setConfig] = useState({
        organizationId: '',
        userId: '',
        currentPage: 'dashboard',
        courseId: '',
        lessonId: '',
    });

    // Direct Lyzr API configuration
    const [directConfig, setDirectConfig] = useState({
        apiKey: 'sk-default-AP2dc2OE8ElziiXisioG75rOg6EZZ8B8',
        agentId: '68fb2db0058210757bf62a4d',
        userId: 'amit',
        sessionId: 'abcd',
    });

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (endpointType === 'custom' && (!config.organizationId || !config.userId)) {
            setError('Please provide organizationId and userId in the configuration');
            return;
        }

        if (endpointType === 'direct' && (!directConfig.apiKey || !directConfig.agentId || !directConfig.userId)) {
            setError('Please provide API Key, Agent ID, and User ID for direct endpoint');
            return;
        }

        setError(null);
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Create assistant message placeholder
        const assistantMessageId = `assistant-${Date.now()}`;
        setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

        try {
            abortControllerRef.current = new AbortController();

            let response: Response;

            if (endpointType === 'custom') {
                // Use custom Next.js API endpoint
                response = await fetch('/api/ai/chat/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: userMessage.content,
                        organizationId: config.organizationId,
                        userId: config.userId,
                        sessionId: sessionId,
                        context: {
                            currentPage: config.currentPage,
                            courseId: config.courseId || undefined,
                            lessonId: config.lessonId || undefined,
                        },
                    }),
                    signal: abortControllerRef.current.signal,
                });
            } else {
                // Use direct Lyzr API endpoint
                const finalSessionId = sessionId || directConfig.sessionId || `session-${Date.now()}`;
                response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/stream/', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': directConfig.apiKey,
                    },
                    body: JSON.stringify({
                        user_id: directConfig.userId,
                        agent_id: directConfig.agentId,
                        session_id: finalSessionId,
                        message: userMessage.content,
                        system_prompt_variables: {},
                        filter_variables: {},
                        features: [],
                        messages: [],
                        assets: [],
                    }),
                    signal: abortControllerRef.current.signal,
                });

                // Set session ID for direct endpoint
                if (!sessionId) {
                    setSessionId(finalSessionId);
                }
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            // Get session ID from response headers
            const newSessionId = response.headers.get('X-Session-Id');
            if (newSessionId) {
                setSessionId(newSessionId);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        accumulatedContent += data;
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, content: accumulatedContent }
                                    : msg
                            )
                        );
                    }
                }
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                setError(err instanceof Error ? err.message : 'An error occurred');
                // Remove the empty assistant message on error
                setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [input, isLoading, config, directConfig, sessionId, endpointType]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const clearChat = () => {
        setMessages([]);
        setSessionId(null);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Streamdown Test Page
                </h1>

                {/* Endpoint Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        Endpoint Selection
                    </h2>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="endpoint"
                                value="custom"
                                checked={endpointType === 'custom'}
                                onChange={() => setEndpointType('custom')}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>Custom Endpoint</strong> (/api/ai/chat/stream)
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="endpoint"
                                value="direct"
                                checked={endpointType === 'direct'}
                                onChange={() => setEndpointType('direct')}
                                className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>Direct Lyzr API</strong> (agent-prod.studio.lyzr.ai)
                            </span>
                        </label>
                    </div>
                </div>

                {/* Configuration Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        {endpointType === 'custom' ? 'Custom Endpoint Configuration' : 'Direct Lyzr API Configuration'}
                    </h2>
                    
                    {endpointType === 'direct' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    API Key *
                                </label>
                                <input
                                    type="password"
                                    value={directConfig.apiKey}
                                    onChange={(e) => setDirectConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="sk-default-..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Agent ID *
                                </label>
                                <input
                                    type="text"
                                    value={directConfig.agentId}
                                    onChange={(e) => setDirectConfig(prev => ({ ...prev, agentId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter agent ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    User ID *
                                </label>
                                <input
                                    type="text"
                                    value={directConfig.userId}
                                    onChange={(e) => setDirectConfig(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter user ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Session ID (optional)
                                </label>
                                <input
                                    type="text"
                                    value={directConfig.sessionId}
                                    onChange={(e) => setDirectConfig(prev => ({ ...prev, sessionId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter session ID or leave for auto-generate"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Organization ID *
                                </label>
                                <input
                                    type="text"
                                    value={config.organizationId}
                                    onChange={(e) => setConfig(prev => ({ ...prev, organizationId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter organization ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    User ID (Lyzr ID) *
                                </label>
                                <input
                                    type="text"
                                    value={config.userId}
                                    onChange={(e) => setConfig(prev => ({ ...prev, userId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter user ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Current Page
                                </label>
                                <select
                                    value={config.currentPage}
                                    onChange={(e) => setConfig(prev => ({ ...prev, currentPage: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                >
                                    <option value="dashboard">Dashboard</option>
                                    <option value="course">Course</option>
                                    <option value="lesson">Lesson</option>
                                    <option value="quiz">Quiz</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Course ID (optional)
                                </label>
                                <input
                                    type="text"
                                    value={config.courseId}
                                    onChange={(e) => setConfig(prev => ({ ...prev, courseId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter course ID"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Lesson ID (optional)
                                </label>
                                <input
                                    type="text"
                                    value={config.lessonId}
                                    onChange={(e) => setConfig(prev => ({ ...prev, lessonId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Enter lesson ID"
                                />
                            </div>
                        </div>
                    )}
                    {sessionId && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Session ID: {sessionId}
                        </p>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                        <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Chat Messages */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-[400px] text-gray-500 dark:text-gray-400">
                            <p>Send a message to start the conversation</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-3 ${
                                            message.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <Streamdown
                                                isAnimating={isLoading && message.id === messages[messages.length - 1]?.id}
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                            >
                                                {message.content || '...'}
                                            </Streamdown>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Stop
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Send
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={clearChat}
                        className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Clear
                    </button>
                </form>
            </div>
        </div>
    );
}