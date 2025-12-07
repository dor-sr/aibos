'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    duration?: number;
    success?: boolean;
    data?: Record<string, unknown>;
  };
}

interface AgentConfig {
  verticalType: 'ecommerce' | 'saas' | 'generic';
  currency: string;
  timezone: string;
}

const SUGGESTED_QUESTIONS = {
  ecommerce: [
    'What was my total revenue last week?',
    'What are my top 5 selling products?',
    'How are new vs returning customers performing?',
    'What is my average order value?',
    'Which day had the highest sales?',
  ],
  saas: [
    'What is my current MRR?',
    'How many new subscriptions this month?',
    'What is my churn rate?',
    'Which plan is most popular?',
    'How did MRR change compared to last month?',
  ],
  generic: [
    'Show me a summary of my business',
    'What are the key metrics?',
    'How is my business performing?',
  ],
};

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({
    verticalType: 'ecommerce',
    currency: 'USD',
    timezone: 'UTC',
  });
  const [showConfig, setShowConfig] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/playground/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content.trim(),
          config,
        }),
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer || data.error || 'No response received',
        timestamp: new Date(),
        metadata: {
          intent: data.intent,
          duration,
          success: data.success,
          data: data.data,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        metadata: {
          duration,
          success: false,
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Agent Playground</h1>
              <p className="text-sm text-muted-foreground">
                Test the Analytics Agent directly
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <span
                className={`h-2 w-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}
              />
              {loading ? 'Processing' : 'Ready'}
            </Badge>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Chat Area */}
          <div className="space-y-4">
            {/* Messages */}
            <Card className="min-h-[500px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  Conversation
                  {messages.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {messages.length} message{messages.length !== 1 && 's'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm mb-6">
                      Ask any question about your business data. The Analytics
                      Agent will analyze and respond.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {SUGGESTED_QUESTIONS[config.verticalType]
                        .slice(0, 3)
                        .map((q) => (
                          <button
                            key={q}
                            onClick={() => sendMessage(q)}
                            className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line">
                            {message.content}
                          </p>
                          {message.metadata && (
                            <div className="mt-2 pt-2 border-t border-current/10 flex flex-wrap gap-2 text-xs opacity-70">
                              {message.metadata.intent && (
                                <span className="flex items-center gap-1">
                                  Intent: {message.metadata.intent}
                                </span>
                              )}
                              {message.metadata.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {message.metadata.duration}ms
                                </span>
                              )}
                              {message.metadata.success !== undefined && (
                                <span className="flex items-center gap-1">
                                  {message.metadata.success ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                  {message.metadata.success
                                    ? 'Success'
                                    : 'Failed'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Analyzing...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input */}
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your business..."
                    className="min-h-[44px] max-h-32 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="text-base font-medium">
                    Configuration
                  </CardTitle>
                  {showConfig ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {showConfig && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vertical">Vertical Type</Label>
                    <Tabs
                      value={config.verticalType}
                      onValueChange={(v) =>
                        setConfig((c) => ({
                          ...c,
                          verticalType: v as AgentConfig['verticalType'],
                        }))
                      }
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="ecommerce" className="flex-1">
                          Ecommerce
                        </TabsTrigger>
                        <TabsTrigger value="saas" className="flex-1">
                          SaaS
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={config.currency}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, currency: e.target.value }))
                      }
                      placeholder="USD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={config.timezone}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, timezone: e.target.value }))
                      }
                      placeholder="UTC"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Suggested Questions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  Suggested Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS[config.verticalType].map((question) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      disabled={loading}
                      className="w-full text-left text-sm p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>Note:</strong> This playground bypasses
                    authentication for testing purposes.
                  </p>
                  <p>
                    Without OpenAI API key configured, responses will be demo
                    data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}




