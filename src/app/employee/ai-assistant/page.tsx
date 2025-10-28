"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function EmployeeAIAssistantPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI Learning Assistant. I can help you with:\n\n• Understanding course content\n• Answering questions about lessons\n• Explaining complex topics\n• Providing learning tips and strategies\n• Tracking your progress\n\nWhat would you like to know?",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = input;
    setInput("");
    setIsSending(true);

    try {
      // TODO: Get organizationId and userId from context/auth
      const organizationId = 'temp-org-id';
      const userId = 'temp-user-id';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          organizationId,
          userId,
          context: {
            currentPage: 'ai-assistant',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error. Please try again later.",
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex-1 overflow-hidden bg-muted/20 relative w-full h-full">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute inset-0 bg-grid-pattern"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      AI Learning Assistant
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg">
                      Your personal guide to mastering courses
                    </p>
                  </div>

                  {/* Messages */}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/60 border border-border/30 backdrop-blur-sm'
                        }`}
                      >
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          message.role === 'user' ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                          {message.content}
                        </div>
                        <p className={`text-xs mt-2 ${
                          message.role === 'user'
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
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading Indicator */}
                  {isSending && (
                    <div className="flex gap-4 justify-start animate-fade-in-up">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted/60 border border-border/30 backdrop-blur-sm rounded-2xl px-4 py-3 max-w-2xl">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - Fixed at bottom */}
              <div className="border-t bg-background/80 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me anything about your courses..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSending}
                      className="flex-1 h-12 text-base border-2 border-border focus:border-primary rounded-lg"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isSending}
                      className="h-12 px-6 flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Powered by Lyzr AI • Context-aware learning assistance
                  </p>
                </div>
            </div>
          </div>
        </main>
  );
}
