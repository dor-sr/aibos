/**
 * Knowledge Base System
 * 
 * Manages employee knowledge including company info, products, processes, and FAQs.
 */

import { createLogger } from '@aibos/core';
import type { KnowledgeBaseEntry } from '../types';

const logger = createLogger('employee:knowledge-base');

export type KnowledgeCategory = 
  | 'company'
  | 'product'
  | 'process'
  | 'faq'
  | 'policy'
  | 'custom';

export interface KnowledgeSearchResult {
  entry: KnowledgeBaseEntry;
  score: number;
}

export interface CreateKnowledgeInput {
  employeeId: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  priority?: number;
  expiresAt?: Date;
}

/**
 * Knowledge Base Manager
 */
export class KnowledgeBase {
  private entries: Map<string, KnowledgeBaseEntry> = new Map();
  private employeeId: string;

  constructor(employeeId: string) {
    this.employeeId = employeeId;
  }

  /**
   * Add a knowledge entry
   */
  async addEntry(input: CreateKnowledgeInput): Promise<KnowledgeBaseEntry> {
    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const entry: KnowledgeBaseEntry = {
      id,
      employeeId: this.employeeId,
      category: input.category,
      title: input.title,
      content: input.content,
      priority: input.priority ?? 1,
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    // TODO: Generate embedding for semantic search
    // entry.embedding = await this.generateEmbedding(input.content);

    this.entries.set(id, entry);

    logger.info('Knowledge entry added', {
      id,
      category: input.category,
      title: input.title,
    });

    return entry;
  }

  /**
   * Get an entry by ID
   */
  getEntry(id: string): KnowledgeBaseEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: KnowledgeCategory): KnowledgeBaseEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.category === category)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Search knowledge base with keyword matching
   */
  search(query: string, options?: {
    category?: KnowledgeCategory;
    limit?: number;
  }): KnowledgeSearchResult[] {
    const { category, limit = 10 } = options || {};
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let results: KnowledgeSearchResult[] = [];

    for (const entry of this.entries.values()) {
      // Skip expired entries
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        continue;
      }

      // Filter by category if specified
      if (category && entry.category !== category) {
        continue;
      }

      // Calculate relevance score
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();

      let score = 0;

      // Exact title match
      if (titleLower.includes(queryLower)) {
        score += 10;
      }

      // Word matches in title
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          score += 5;
        }
        if (contentLower.includes(word)) {
          score += 1;
        }
      }

      // Priority boost
      score += entry.priority * 0.5;

      if (score > 0) {
        results.push({ entry, score });
      }
    }

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Update an entry
   */
  async updateEntry(id: string, updates: Partial<CreateKnowledgeInput>): Promise<KnowledgeBaseEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) {
      return null;
    }

    const updated: KnowledgeBaseEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date(),
    };

    // Regenerate embedding if content changed
    if (updates.content) {
      // TODO: Generate new embedding
      // updated.embedding = await this.generateEmbedding(updates.content);
    }

    this.entries.set(id, updated);

    logger.info('Knowledge entry updated', { id });

    return updated;
  }

  /**
   * Delete an entry
   */
  deleteEntry(id: string): boolean {
    const deleted = this.entries.delete(id);
    if (deleted) {
      logger.info('Knowledge entry deleted', { id });
    }
    return deleted;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    logger.info('Knowledge base cleared', { employeeId: this.employeeId });
  }

  /**
   * Get all entries
   */
  getAllEntries(): KnowledgeBaseEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.entries.size;
  }

  /**
   * Load entries from external source
   */
  async loadEntries(entries: KnowledgeBaseEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
    logger.info('Knowledge base loaded', {
      employeeId: this.employeeId,
      count: entries.length,
    });
  }

  /**
   * Build context from knowledge base for prompts
   */
  buildContext(query: string, maxTokens: number = 2000): string {
    const results = this.search(query, { limit: 5 });
    
    if (results.length === 0) {
      return '';
    }

    let context = '## Relevant Knowledge\n\n';
    let currentLength = context.length;

    for (const { entry } of results) {
      const entryText = `### ${entry.title}\n${entry.content}\n\n`;
      
      // Rough token estimation (4 chars per token)
      if (currentLength + entryText.length / 4 > maxTokens) {
        break;
      }

      context += entryText;
      currentLength += entryText.length;
    }

    return context;
  }

  /**
   * Export knowledge base
   */
  export(): KnowledgeBaseEntry[] {
    return this.getAllEntries();
  }
}

/**
 * Create a knowledge base instance
 */
export function createKnowledgeBase(employeeId: string): KnowledgeBase {
  return new KnowledgeBase(employeeId);
}

/**
 * Pre-built knowledge templates for different employee types
 */
export const KNOWLEDGE_TEMPLATES = {
  project_manager: [
    {
      category: 'process' as KnowledgeCategory,
      title: 'Daily Standup Process',
      content: `Daily standups are collected asynchronously. Each team member should answer:
1. What did you work on yesterday?
2. What are you working on today?
3. Any blockers or concerns?

Standups should be submitted by 10am local time.`,
      priority: 10,
    },
    {
      category: 'process' as KnowledgeCategory,
      title: 'Task Priority Levels',
      content: `Task priorities are defined as:
- Critical: Must be done today, blocking other work
- High: Should be done this week, important for deadlines
- Medium: Normal priority, do when capacity allows
- Low: Nice to have, can be deferred`,
      priority: 8,
    },
    {
      category: 'process' as KnowledgeCategory,
      title: 'Escalation Process',
      content: `Escalate to human manager when:
- A blocker has not been resolved in 48 hours
- Team member has missed 3+ standups
- Critical task is at risk of missing deadline
- Conflict between team members`,
      priority: 9,
    },
  ],
  customer_success: [
    {
      category: 'process' as KnowledgeCategory,
      title: 'Onboarding Checklist',
      content: `New client onboarding steps:
1. Welcome email with key contacts
2. Kickoff call scheduling
3. Account setup verification
4. Training session scheduling
5. 30-day check-in scheduling`,
      priority: 10,
    },
    {
      category: 'process' as KnowledgeCategory,
      title: 'Health Score Factors',
      content: `Client health is measured by:
- Product usage (daily/weekly active users)
- Support ticket volume and sentiment
- Feature adoption rate
- Engagement with communications
- Contract renewal timeline`,
      priority: 9,
    },
  ],
  sales_dev: [
    {
      category: 'process' as KnowledgeCategory,
      title: 'Lead Qualification Criteria',
      content: `Qualified leads must have:
- Budget: Confirmed budget or budget authority
- Authority: Decision maker or strong influencer
- Need: Clear problem our product solves
- Timeline: Planning to evaluate within 3 months`,
      priority: 10,
    },
  ],
  support: [
    {
      category: 'process' as KnowledgeCategory,
      title: 'Ticket Priority Levels',
      content: `Ticket priorities:
- P1: System down, all users affected - respond in 15 mins
- P2: Major feature broken - respond in 1 hour
- P3: Feature degraded - respond in 4 hours
- P4: Question/enhancement - respond in 24 hours`,
      priority: 10,
    },
  ],
  executive_assistant: [
    {
      category: 'process' as KnowledgeCategory,
      title: 'Calendar Management Rules',
      content: `Calendar priorities:
1. External meetings with clients/investors
2. Team all-hands and leadership meetings
3. 1:1s with direct reports
4. Internal project meetings
5. Optional/informational meetings

Always keep 2 hours blocked daily for focus time.`,
      priority: 10,
    },
  ],
};

