"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { Bot, Send, User, Minimize2, BookOpen, GraduationCap } from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

export function AiTutorPanel() {
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI Learning Assistant. I can help you understand course content, answer questions, and guide your learning journey. How can I help you today?",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Context state
  const [currentContext, setCurrentContext] = useState<{
    page: 'dashboard' | 'course-view' | 'lesson-view' | 'ai-assistant';
    courseId?: string;
    lessonId?: string;
    courseName?: string;
    lessonName?: string;
  }>({
    page: 'dashboard',
  });

  // Detect current page context
  useEffect(() => {
    const detectContext = async () => {
      // Lesson view: /employee/courses/[id]/lessons/[lessonId]
      if (pathname?.includes('/lessons/') && params?.lessonId) {
        const courseId = params.id as string;
        const lessonId = params.lessonId as string;

        try {
          // Fetch lesson and course details for display
          const courseResponse = await fetch(`/api/courses/${courseId}`);
          if (courseResponse.ok) {
            const courseData = await courseResponse.json();
            let lessonName = 'Current Lesson';

            // Find lesson in course modules
            for (const module of courseData.course.modules || []) {
              const lesson = module.lessons?.find((l: any) => l._id === lessonId);
              if (lesson) {
                lessonName = lesson.title;
                break;
              }
            }

            setCurrentContext({
              page: 'lesson-view',
              courseId,
              lessonId,
              courseName: courseData.course.title,
              lessonName,
            });
          }
        } catch (error) {
          console.error('Error fetching context:', error);
          setCurrentContext({
            page: 'lesson-view',
            courseId,
            lessonId,
          });
        }
      }
      // Course view: /employee/courses/[id]
      else if (pathname?.includes('/courses/') && params?.id && !pathname?.includes('/lessons/')) {
        const courseId = params.id as string;

        try {
          const courseResponse = await fetch(`/api/courses/${courseId}`);
          if (courseResponse.ok) {
            const courseData = await courseResponse.json();
            setCurrentContext({
              page: 'course-view',
              courseId,
              courseName: courseData.course.title,
            });
          }
        } catch (error) {
          console.error('Error fetching context:', error);
          setCurrentContext({
            page: 'course-view',
            courseId,
          });
        }
      }
      // AI assistant page
      else if (pathname?.includes('/ai-assistant')) {
        setCurrentContext({
          page: 'ai-assistant',
        });
      }
      // Dashboard or other pages
      else {
        setCurrentContext({
          page: 'dashboard',
        });
      }
    };

    detectContext();
  }, [pathname, params]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    // Create placeholder for AI response
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    const messageContent = input;
    setInput("");
    setIsSending(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      if (!currentOrganization || !userId) {
        throw new Error('Please select an organization and sign in');
      }

      console.log('🤖 Sending AI chat stream request with context:', {
        page: currentContext.page,
        courseId: currentContext.courseId,
        lessonId: currentContext.lessonId,
        courseName: currentContext.courseName,
        lessonName: currentContext.lessonName,
      });

      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          organizationId: currentOrganization.id,
          userId: userId,
          sessionId: sessionId,
          context: {
            currentPage: currentContext.page,
            courseId: currentContext.courseId,
            lessonId: currentContext.lessonId,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Get session ID from header
      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId) {
        setSessionId(newSessionId);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            
            if (content === '[DONE]') {
              // Stream complete
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              ));
            } else if (content) {
              accumulatedContent += content;
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ));
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Error getting AI response:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, content: "I'm sorry, I encountered an error. Please try again.", isStreaming: false }
          : msg
      ));
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [input, isSending, currentOrganization, userId, sessionId, currentContext]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-lg border-l rounded-none">
      {/* Header */}
      <div className="border-b p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Learning Assistant</h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Context Indicator */}
        {currentContext.page === 'lesson-view' && currentContext.lessonName ? (
          <Badge variant="secondary" className="text-xs gap-1 max-w-full">
            <BookOpen className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">@ {currentContext.lessonName}</span>
          </Badge>
        ) : currentContext.page === 'course-view' && currentContext.courseName ? (
          <Badge variant="secondary" className="text-xs gap-1 max-w-full">
            <GraduationCap className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">@ {currentContext.courseName}</span>
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground">Always here to help :)</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4 pb-4">
          {messages.map((message) => {
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}
                >
                  <div className="text-sm">
                    {message.role === 'assistant' ? (
                      <Streamdown
                        parseIncompleteMarkdown={true}
                        isAnimating={message.isStreaming}
                        components={{
                          a: ({ ...props }) => (
                            <a
                              {...props}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-600/50 dark:decoration-blue-400/50 underline-offset-4 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {props.children}
                              <span className="inline-block ml-1 align-middle">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                              </span>
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </Streamdown>
                    ) : (
                      <Streamdown
                        parseIncompleteMarkdown={true}
                        components={{
                          a: ({ ...props }) => (
                            <a
                              {...props}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-600/50 dark:decoration-blue-400/50 underline-offset-4 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {props.children}
                              <span className="inline-block ml-1 align-middle">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                              </span>
                            </a>
                          ),
                        }}
                      >
                        {message.content}
                      </Streamdown>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${message.role === 'user'
                    ? 'text-primary-foreground/60'
                    : 'text-muted-foreground'
                    }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
          {/* Loading indicator - only show when waiting for first chunk */}
          {isSending && messages[messages.length - 1]?.content === '' && (
            <div className="flex gap-2 justify-start">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-muted">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4 w-full text-center">
          Powered by Lyzr AI
        </p>
      </div>
    </Card>
  );
}
