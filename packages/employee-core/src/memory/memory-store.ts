/**
 * Memory Store
 * 
 * Long-term memory storage and retrieval for AI employees.
 */

import { createLogger } from '@aibos/core';
import type { MemoryContextType } from '../types';
import type {
  MemoryEntry,
  MemorySearchOptions,
  MemorySearchResult,
  CreateMemoryInput,
  MemoryStats,
  ConsolidationResult,
} from './types';

const logger = createLogger('employee:memory');

/**
 * Memory Store class for managing employee memories
 */
export class MemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();
  private employeeId: string;
  private maxMemories: number;

  constructor(employeeId: string, maxMemories: number = 10000) {
    this.employeeId = employeeId;
    this.maxMemories = maxMemories;
  }

  /**
   * Store a new memory
   */
  async store(input: CreateMemoryInput): Promise<MemoryEntry> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const memory: MemoryEntry = {
      id,
      employeeId: this.employeeId,
      contextType: input.contextType,
      contextId: input.contextId,
      content: input.content,
      importanceScore: input.importanceScore ?? 0.5,
      accessCount: 0,
      lastAccessedAt: now,
      expiresAt: input.expiresAt,
      tags: input.tags,
      metadata: input.metadata,
      createdAt: now,
    };

    // Check if we need to prune old memories
    if (this.memories.size >= this.maxMemories) {
      await this.pruneOldMemories();
    }

    this.memories.set(id, memory);

    logger.debug('Memory stored', {
      id,
      contextType: input.contextType,
      contextId: input.contextId,
    });

    return memory;
  }

  /**
   * Retrieve a memory by ID
   */
  get(id: string): MemoryEntry | undefined {
    const memory = this.memories.get(id);
    if (memory) {
      // Update access stats
      memory.accessCount++;
      memory.lastAccessedAt = new Date();
    }
    return memory;
  }

  /**
   * Search memories with keyword matching
   */
  search(query: string, options: MemorySearchOptions = {}): MemorySearchResult[] {
    const {
      contextType,
      contextId,
      limit = 10,
      minImportance = 0,
      includeExpired = false,
    } = options;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const now = new Date();

    const results: MemorySearchResult[] = [];

    for (const memory of this.memories.values()) {
      // Filter by expiration
      if (!includeExpired && memory.expiresAt && memory.expiresAt < now) {
        continue;
      }

      // Filter by context type
      if (contextType && memory.contextType !== contextType) {
        continue;
      }

      // Filter by context ID
      if (contextId && memory.contextId !== contextId) {
        continue;
      }

      // Filter by minimum importance
      if (memory.importanceScore < minImportance) {
        continue;
      }

      // Calculate relevance score
      const contentLower = memory.content.toLowerCase();
      let score = 0;

      // Exact query match
      if (contentLower.includes(queryLower)) {
        score += 5;
      }

      // Word matches
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 1;
        }
      }

      // Tag matches
      if (memory.tags) {
        for (const tag of memory.tags) {
          if (queryLower.includes(tag.toLowerCase())) {
            score += 2;
          }
        }
      }

      // Boost by importance
      score *= (1 + memory.importanceScore);

      // Boost by recency (memories accessed recently are more relevant)
      const daysSinceAccess = (now.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - daysSinceAccess / 30);
      score *= (1 + recencyBoost * 0.5);

      if (score > 0) {
        results.push({ memory, relevanceScore: score });
      }
    }

    // Sort by relevance and limit
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Get memories for a specific context
   */
  getByContext(
    contextType: MemoryContextType,
    contextId: string,
    limit: number = 50
  ): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const now = new Date();

    for (const memory of this.memories.values()) {
      if (memory.contextType === contextType && memory.contextId === contextId) {
        // Skip expired
        if (memory.expiresAt && memory.expiresAt < now) {
          continue;
        }
        results.push(memory);
      }
    }

    // Sort by importance and recency
    return results
      .sort((a, b) => {
        const importanceDiff = b.importanceScore - a.importanceScore;
        if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
        return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
      })
      .slice(0, limit);
  }

  /**
   * Update a memory's importance score
   */
  updateImportance(id: string, importanceScore: number): boolean {
    const memory = this.memories.get(id);
    if (!memory) return false;

    memory.importanceScore = Math.max(0, Math.min(1, importanceScore));
    return true;
  }

  /**
   * Delete a memory
   */
  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  /**
   * Delete memories by context
   */
  deleteByContext(contextType: MemoryContextType, contextId: string): number {
    let deleted = 0;
    for (const [id, memory] of this.memories.entries()) {
      if (memory.contextType === contextType && memory.contextId === contextId) {
        this.memories.delete(id);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Prune old and low-importance memories
   */
  async pruneOldMemories(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let pruned = 0;

    // First, remove expired memories
    for (const [id, memory] of this.memories.entries()) {
      if (memory.expiresAt && memory.expiresAt < now) {
        this.memories.delete(id);
        pruned++;
      }
    }

    // If still over limit, remove low-importance old memories
    if (this.memories.size >= this.maxMemories * 0.9) {
      const toRemove: string[] = [];

      for (const [id, memory] of this.memories.entries()) {
        if (
          memory.lastAccessedAt < thirtyDaysAgo &&
          memory.importanceScore < 0.3 &&
          memory.accessCount < 5
        ) {
          toRemove.push(id);
        }
      }

      for (const id of toRemove) {
        this.memories.delete(id);
        pruned++;
      }
    }

    if (pruned > 0) {
      logger.info('Pruned memories', { count: pruned, employeeId: this.employeeId });
    }

    return pruned;
  }

  /**
   * Consolidate similar memories
   */
  async consolidate(): Promise<ConsolidationResult> {
    // Group memories by context
    const contextGroups = new Map<string, MemoryEntry[]>();

    for (const memory of this.memories.values()) {
      const key = `${memory.contextType}:${memory.contextId}`;
      const group = contextGroups.get(key) || [];
      group.push(memory);
      contextGroups.set(key, group);
    }

    let mergedCount = 0;
    let deletedCount = 0;
    const newMemories: MemoryEntry[] = [];

    // For each context with many memories, consolidate
    for (const [_key, memories] of contextGroups.entries()) {
      if (memories.length > 20) {
        // Sort by importance
        memories.sort((a, b) => b.importanceScore - a.importanceScore);

        // Keep top 10, merge the rest into a summary
        const toKeep = memories.slice(0, 10);
        const toMerge = memories.slice(10);

        const firstToMerge = toMerge[0];
        if (toMerge.length > 0 && firstToMerge) {
          // Create summary memory
          const summaryContent = toMerge
            .map(m => `- ${m.content.slice(0, 100)}`)
            .join('\n');

          const summary = await this.store({
            contextType: firstToMerge.contextType,
            contextId: firstToMerge.contextId,
            content: `Summary of ${toMerge.length} memories:\n${summaryContent}`,
            importanceScore: 0.6,
            tags: ['consolidated', 'summary'],
          });

          newMemories.push(summary);
          mergedCount += toMerge.length;

          // Delete merged memories
          for (const mem of toMerge) {
            this.memories.delete(mem.id);
            deletedCount++;
          }
        }
      }
    }

    if (mergedCount > 0) {
      logger.info('Consolidated memories', {
        mergedCount,
        deletedCount,
        newMemories: newMemories.length,
      });
    }

    return { mergedCount, deletedCount, newMemories };
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const byContextType: Record<MemoryContextType, number> = {
      contact: 0,
      project: 0,
      workspace: 0,
      conversation: 0,
    };

    let totalImportance = 0;
    let oldest: Date | undefined;
    let newest: Date | undefined;

    for (const memory of this.memories.values()) {
      byContextType[memory.contextType]++;
      totalImportance += memory.importanceScore;

      if (!oldest || memory.createdAt < oldest) {
        oldest = memory.createdAt;
      }
      if (!newest || memory.createdAt > newest) {
        newest = memory.createdAt;
      }
    }

    return {
      totalMemories: this.memories.size,
      byContextType,
      averageImportance: this.memories.size > 0 ? totalImportance / this.memories.size : 0,
      oldestMemory: oldest,
      newestMemory: newest,
    };
  }

  /**
   * Build context string for LLM prompts
   */
  buildContext(query: string, contextType?: MemoryContextType, maxTokens: number = 1500): string {
    const results = this.search(query, {
      contextType,
      limit: 10,
      minImportance: 0.3,
    });

    if (results.length === 0) {
      return '';
    }

    let context = '## Relevant Memories\n\n';
    let currentLength = context.length;

    for (const { memory } of results) {
      const memoryText = `- [${memory.contextType}] ${memory.content}\n`;

      // Rough token estimation
      if (currentLength + memoryText.length / 4 > maxTokens) {
        break;
      }

      context += memoryText;
      currentLength += memoryText.length;
    }

    return context;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
    logger.info('Memory store cleared', { employeeId: this.employeeId });
  }

  /**
   * Export all memories
   */
  export(): MemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Import memories
   */
  import(memories: MemoryEntry[]): void {
    for (const memory of memories) {
      this.memories.set(memory.id, memory);
    }
    logger.info('Memories imported', { count: memories.length });
  }
}

/**
 * Create a memory store instance
 */
export function createMemoryStore(employeeId: string, maxMemories?: number): MemoryStore {
  return new MemoryStore(employeeId, maxMemories);
}

