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
import {
  Bot,
  Send,
  User,
  Minimize2,
  BookOpen,
  GraduationCap,
  History,
  Plus,
  MessageSquare,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { Streamdown } from "streamdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: {
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}

interface Conversation {
  _id: string;
  sessionId: string;
  lastMessageAt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      assetId: string;
    }>;
  }>;
  context?: {
    currentPage?: string;
    courseId?: string;
    lessonId?: string;
  };
}

export function AiTutorPanel() {
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [hasReceivedFirstToken, setHasReceivedFirstToken] = useState(false);

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
      if (pathname?.includes('/lessons/') && params?.lessonId) {
        const courseId = params.id as string;
        const lessonId = params.lessonId as string;

        try {
          const courseResponse = await fetch(`/api/courses/${courseId}`);
          if (courseResponse.ok) {
            const courseData = await courseResponse.json();
            let lessonName = 'Current Lesson';

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
      else if (pathname?.includes('/ai-assistant')) {
        setCurrentContext({
          page: 'ai-assistant',
        });
      }
      else {
        setCurrentContext({
          page: 'dashboard',
        });
      }
    };

    detectContext();
  }, [pathname, params]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId || !currentOrganization) return;

    setIsLoadingConversations(true);
    try {
      const response = await fetch(`/api/ai/conversations?userId=${userId}&organizationId=${currentOrganization.id}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [userId, currentOrganization]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load a previous conversation
  const loadConversation = useCallback((conversation: Conversation) => {
    const loadedMessages: Message[] = conversation.messages.map((msg, idx) => ({
      id: `${conversation._id}-${idx}`,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.timestamp),
      attachments: msg.attachments?.map(att => ({
        name: att.name,
        type: att.type,
        size: att.size,
        url: att.assetId, // Use assetId as URL for now
      })),
    }));

    setMessages(loadedMessages);
    setSessionId(conversation.sessionId);
  }, []);

  // Start a new chat
  const startNewChat = useCallback(() => {
    setMessages([
      {
        id: '1',
        content: "Hi! I'm your AI Learning Assistant. I can help you understand course content, answer questions, and guide your learning journey. How can I help you today?",
        role: 'assistant',
        timestamp: new Date(),
      }
    ]);
    setSessionId(null);
    setSelectedFiles([]);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isSending) return;

    // Upload files first if any
    let uploadedAssetIds: string[] = [];
    if (selectedFiles.length > 0) {
      if (!currentOrganization) {
        console.error('❌ No organization selected');
        return;
      }

      setUploadingFiles(true);
      try {
        console.log('📎 Uploading', selectedFiles.length, 'files...');
        // Upload each file individually
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('organizationId', currentOrganization.id);

          const uploadResponse = await fetch('/api/upload-asset', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            console.log('✅ File uploaded:', file.name, '→ Asset IDs:', uploadData.assetIds);
            uploadedAssetIds.push(...(uploadData.assetIds || []));
          } else {
            console.error('❌ Failed to upload file:', file.name, uploadResponse.status);
          }
        }
        console.log('📎 All files uploaded. Total asset IDs:', uploadedAssetIds);
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        setUploadingFiles(false);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
      attachments: selectedFiles.map((file, idx) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: uploadedAssetIds[idx] || '',
      })),
    };

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
    setSelectedFiles([]);
    setIsSending(true);
    setHasReceivedFirstToken(false);

    abortControllerRef.current = new AbortController();

    try {
      if (!currentOrganization || !userId) {
        throw new Error('Please select an organization and sign in');
      }

      const chatPayload = {
        message: messageContent,
        organizationId: currentOrganization.id,
        userId: userId,
        sessionId: sessionId,
        assetIds: uploadedAssetIds,
        attachments: selectedFiles.map((file, idx) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          assetId: uploadedAssetIds[idx] || '',
        })),
        context: {
          currentPage: currentContext.page,
          courseId: currentContext.courseId,
          lessonId: currentContext.lessonId,
        },
      };

      console.log('💬 Sending chat message with payload:', JSON.stringify({
        ...chatPayload,
        message: messageContent.substring(0, 50) + '...',
      }, null, 2));

      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

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
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);

            if (content === '[DONE]') {
              setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              ));
              // Refresh conversations list
              fetchConversations();
            } else if (content) {
              if (!hasReceivedFirstToken) {
                setHasReceivedFirstToken(true);
              }
              // Convert escaped newlines to actual newlines
              // Don't trim - preserve all whitespace including leading/trailing spaces
              const decodedContent = content
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r');

              accumulatedContent += decodedContent;
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
      setHasReceivedFirstToken(false);
      abortControllerRef.current = null;
    }
  }, [input, isSending, currentOrganization, userId, sessionId, currentContext, selectedFiles, hasReceivedFirstToken, fetchConversations]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-lg border-l rounded-none animate-in slide-in-from-right duration-300 py-4">
      {/* Header */}
      <div className="border-b p-4 bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Learning Assistant</h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted/50 transition-colors"
                >
                  <History className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Chat History</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startNewChat}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    New Chat
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {isLoadingConversations ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No previous conversations
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <DropdownMenuItem
                        key={conversation._id}
                        className="flex items-start gap-2 p-3 cursor-pointer"
                        onClick={() => loadConversation(conversation)}
                      >
                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {conversation.messages[0]?.content || 'New conversation'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted/50 transition-colors"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Context Indicator */}
        {currentContext.page === 'lesson-view' && currentContext.lessonName ? (
          <Badge variant="secondary" className="text-xs gap-1 max-w-full animate-in fade-in duration-200">
            <BookOpen className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">@ {currentContext.lessonName}</span>
          </Badge>
        ) : currentContext.page === 'course-view' && currentContext.courseName ? (
          <Badge variant="secondary" className="text-xs gap-1 max-w-full animate-in fade-in duration-200">
            <GraduationCap className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">@ {currentContext.courseName}</span>
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground">Always here to help :)</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4 pb-4">
          {messages.map((message) => {
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 break-words overflow-hidden",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&>*]:my-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {message.role === 'assistant' ? (
                        <Streamdown
                          parseIncompleteMarkdown={true}
                          isAnimating={message.isStreaming}
                        >
                          {message.content}
                        </Streamdown>
                      ) : (
                        message.content
                      )}
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs bg-background/50 rounded p-1">
                            {attachment.type.startsWith('image/') ? (
                              <ImageIcon className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            <span className="truncate">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs px-1",
                    message.role === 'user'
                      ? 'text-muted-foreground text-right'
                      : 'text-muted-foreground'
                  )}>
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
          {/* Thinking indicator - show when sending and no first token yet */}
          {isSending && !hasReceivedFirstToken && (
            <div className="flex gap-2 justify-start animate-in fade-in duration-200">
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
        {selectedFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1.5 bg-muted border border-border rounded-lg text-sm"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
            disabled={isSending || uploadingFiles}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,image/jpeg,image/jpg,image/png"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || uploadingFiles}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && selectedFiles.length === 0) || isSending || uploadingFiles}
            size="icon"
            className="flex-shrink-0"
          >
            {uploadingFiles ? (
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4 w-full text-center">
          Powered by Lyzr AI
        </p>
      </div>
    </Card>
  );
}
