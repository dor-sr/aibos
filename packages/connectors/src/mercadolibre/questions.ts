/**
 * MercadoLibre Questions Sync
 */

import { db } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import { createLogger } from '@aibos/core';
import type { MercadoLibreClient } from './client';
import type { MercadoLibreQuestion, MercadoLibreSyncOptions } from './types';

const logger = createLogger('mercadolibre:questions');

// We'll store questions in question_history table
// Import from data-model when schema exists
// For now, we'll define interface

export interface StoredQuestion {
  id: string;
  workspaceId: string;
  externalId: string;
  itemId: string;
  text: string;
  status: string;
  answer?: string;
  answeredAt?: Date;
  fromUserId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transform MercadoLibre question to internal format
 */
function transformQuestion(question: MercadoLibreQuestion, workspaceId: string): Omit<StoredQuestion, 'id'> {
  return {
    workspaceId,
    externalId: String(question.id),
    itemId: question.item_id,
    text: question.text,
    status: question.status,
    answer: question.answer?.text || undefined,
    answeredAt: question.answer?.date_created ? new Date(question.answer.date_created) : undefined,
    fromUserId: String(question.from.id),
    metadata: {
      source: 'mercadolibre',
      sellerId: question.seller_id,
      fromAnsweredQuestions: question.from.answered_questions,
      deletedFromListing: question.deleted_from_listing,
      hold: question.hold,
      answerStatus: question.answer?.status,
    },
    createdAt: new Date(question.date_created),
    updatedAt: new Date(),
  };
}

/**
 * Get statistics about questions
 */
export interface QuestionStats {
  total: number;
  unanswered: number;
  answered: number;
  averageResponseTimeHours: number | null;
}

/**
 * Sync questions from MercadoLibre
 * Note: This is a placeholder - actual implementation depends on having a questions table
 */
export async function syncMercadoLibreQuestions(
  client: MercadoLibreClient,
  workspaceId: string,
  options: MercadoLibreSyncOptions = {}
): Promise<number> {
  // Fetch unanswered questions
  const unansweredQuestions = await client.fetchUnansweredQuestions();
  
  logger.info('Synced MercadoLibre questions', {
    workspaceId,
    count: unansweredQuestions.length,
  });

  // In a full implementation, we would store these in a questions table
  // For now, we just log them and return the count
  
  return unansweredQuestions.length;
}

/**
 * Process a single question from webhook
 */
export async function processMercadoLibreQuestion(
  client: MercadoLibreClient,
  questionId: number,
  workspaceId: string
): Promise<MercadoLibreQuestion> {
  const question = await client.getQuestion(questionId);
  
  logger.info('Processed MercadoLibre question', {
    workspaceId,
    questionId,
    status: question.status,
    itemId: question.item_id,
  });

  return question;
}

/**
 * Get question statistics for dashboard
 */
export async function getQuestionStats(
  client: MercadoLibreClient,
  workspaceId: string
): Promise<QuestionStats> {
  // Fetch all questions (would need pagination in production)
  const unansweredQuestions = await client.fetchUnansweredQuestions();
  const answeredQuestions = await client.listQuestions({ status: 'ANSWERED', limit: 50 });

  const total = unansweredQuestions.length + answeredQuestions.length;
  const unanswered = unansweredQuestions.length;
  const answered = answeredQuestions.length;

  // Calculate average response time from answered questions
  let totalResponseTimeMs = 0;
  let responseCount = 0;

  for (const q of answeredQuestions) {
    if (q.answer?.date_created) {
      const questionTime = new Date(q.date_created).getTime();
      const answerTime = new Date(q.answer.date_created).getTime();
      totalResponseTimeMs += answerTime - questionTime;
      responseCount++;
    }
  }

  const averageResponseTimeHours = responseCount > 0
    ? (totalResponseTimeMs / responseCount) / (1000 * 60 * 60)
    : null;

  return {
    total,
    unanswered,
    answered,
    averageResponseTimeHours,
  };
}

/**
 * Get urgent questions (older than threshold)
 */
export async function getUrgentQuestions(
  client: MercadoLibreClient,
  hoursThreshold: number = 24
): Promise<MercadoLibreQuestion[]> {
  const questions = await client.fetchUnansweredQuestions();
  const now = Date.now();
  const thresholdMs = hoursThreshold * 60 * 60 * 1000;

  return questions.filter(q => {
    const questionAge = now - new Date(q.date_created).getTime();
    return questionAge > thresholdMs;
  });
}
