'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles, AlertCircle } from 'lucide-react';

const suggestions = [
  'Why did revenue change last week?',
  'What are my best selling products?',
  'How are new vs returning customers performing?',
  'Which channel is driving the most sales?',
];

interface AskResponse {
  success: boolean;
  answer: string;
  data?: Record<string, unknown>;
  intent?: string;
  demo?: boolean;
  message?: string;
}

export function AskBox() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch('/api/analytics/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        throw new Error('Failed to process question');
      }

      const data: AskResponse = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Ask error:', err);
      setError('Sorry, I encountered an error processing your question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Ask anything about your business</h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(question);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Why did revenue drop last week?"
              className="pl-10 bg-white"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? 'Thinking...' : 'Ask'}
          </Button>
        </form>

        {/* Suggestions */}
        {!response && !loading && !error && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuestion(suggestion);
                    handleSubmit(suggestion);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border hover:border-primary hover:text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <p className="text-sm leading-relaxed whitespace-pre-line">{response.answer}</p>
            {response.demo && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                Demo response - Connect your data and configure AI to see personalized insights
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <span className="text-sm text-muted-foreground ml-2">Analyzing your data...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
