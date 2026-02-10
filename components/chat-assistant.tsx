"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, Bot, User, Loader2, X, Minimize2, Maximize2, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChatContext, getChatGreeting } from '@/hooks/use-chat-context';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatAssistantProps {}

export function ChatAssistant() {
  const context = useChatContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your CivicResolve assistant. I'm here to help you with reporting issues, understanding the platform, and engaging with your community. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      content: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context: {
            page: context.page,
            pageName: context.pageName,
            issueId: context.issueId,
            userRole: user?.role,
            userName: user?.name,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Chat API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          url: response.url
        });
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Remove loading message and add AI response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        return [
          ...withoutLoading,
          {
            id: Date.now().toString(),
            content: data.response,
            isUser: false,
            timestamp: new Date(),
          },
        ];
      });
    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.isLoading);
        return [
          ...withoutLoading,
          {
            id: Date.now().toString(),
            content: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
            isUser: false,
            timestamp: new Date(),
          },
        ];
      });
      
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getContextBadges = () => {
    const badges = [];
    if (context?.pageName && context.pageName !== 'Home') {
      badges.push(context.pageName);
    }
    if (context?.issueId) {
      badges.push(`Issue #${context.issueId}`);
    }
    return badges;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
          aria-label="Open chat assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className={`max-w-md p-0 transition-all duration-200 flex flex-col ${
          isMinimized ? 'h-16' : 'h-[600px]'
        }`}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-row items-center justify-between p-4 pb-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg">CivicResolve Assistant</DialogTitle>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <>
            {/* Context badges */}
            {getContextBadges().length > 0 && (
              <div className="px-4 pb-2 flex-shrink-0">
                <div className="flex flex-wrap gap-1">
                  {getContextBadges().map((badge, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="flex-shrink-0" />

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 min-h-0" ref={scrollAreaRef}>
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start space-x-2 max-w-[80%] ${
                        message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                          {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`space-y-1 ${message.isUser ? 'text-right' : 'text-left'} min-w-0`}>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm break-words ${
                            message.isUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.isLoading ? (
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          ) : message.isUser ? (
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:m-0 prose-p:leading-relaxed prose-ul:m-0 prose-li:m-0 prose-strong:text-inherit prose-headings:m-0">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 last:mb-0">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 last:mb-0">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  h1: ({ children }) => <h1 className="text-base font-semibold mb-1">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                                  code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-2 italic">{children}</blockquote>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="flex-shrink-0" />

            {/* Input */}
            <div className="p-4 flex-shrink-0">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about CivicResolve..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                CivicResolve AI
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
