'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';

const suggestions = [
  'Why did revenue change last week?',
  'What are my best selling products?',
  'How are new vs returning customers performing?',
  'Which channel is driving the most sales?',
];

export function AskBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    setAnswer(null);

    // Simulate API call - in production this would call the analytics agent
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Demo response
    setAnswer(
      `Based on your data from the last 30 days: Revenue increased by 12.5% compared to the previous period, driven primarily by a 15% increase in average order value. Your top-performing product category was Electronics, contributing 34% of total revenue.`
    );
    setLoading(false);
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
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Thinking...' : 'Ask'}
          </Button>
        </form>

        {/* Suggestions */}
        {!answer && !loading && (
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

        {/* Answer */}
        {answer && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <p className="text-sm leading-relaxed">{answer}</p>
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


