/**
 * Memory System Types
 */

import type { MemoryContextType } from '../types';

export interface MemoryEntry {
  id: string;
  employeeId: string;
  contextType: MemoryContextType;
  contextId: string;
  content: string;
  embedding?: number[];
  importanceScore: number;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MemorySearchOptions {
  contextType?: MemoryContextType;
  contextId?: string;
  limit?: number;
  minImportance?: number;
  includeExpired?: boolean;
}

export interface MemorySearchResult {
  memory: MemoryEntry;
  relevanceScore: number;
}

export interface CreateMemoryInput {
  contextType: MemoryContextType;
  contextId: string;
  content: string;
  importanceScore?: number;
  tags?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MemoryStats {
  totalMemories: number;
  byContextType: Record<MemoryContextType, number>;
  averageImportance: number;
  oldestMemory?: Date;
  newestMemory?: Date;
}

export interface ConsolidationResult {
  mergedCount: number;
  deletedCount: number;
  newMemories: MemoryEntry[];
}

