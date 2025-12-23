/**
 * Qualification Conversation Manager
 * 
 * Manages AI-powered qualification conversations with leads.
 */

import { createLogger } from '@aibos/core';
import type {
  Lead,
  QualificationQuestion,
  BudgetInfo,
  AuthorityInfo,
  NeedInfo,
  TimelineInfo,
} from '../types';

const logger = createLogger('sdr:qualification-conversation');

// ============================================
// CONVERSATION TYPES
// ============================================

export interface QualificationConversation {
  id: string;
  leadId: string;
  sdrEmployeeId: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  turns: ConversationTurn[];
  extractedInfo: ExtractedQualificationInfo;
  currentTopic: 'budget' | 'authority' | 'need' | 'timeline' | 'general';
  questionsAsked: string[];
  nextQuestions: QualificationQuestion[];
}

export interface ConversationTurn {
  id: string;
  role: 'sdr' | 'lead';
  message: string;
  timestamp: Date;
  intent?: DetectedIntent;
  extractedData?: Partial<ExtractedQualificationInfo>;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidenceScore?: number;
}

export interface ExtractedQualificationInfo {
  budget?: Partial<BudgetInfo>;
  authority?: Partial<AuthorityInfo>;
  need?: Partial<NeedInfo>;
  timeline?: Partial<TimelineInfo>;
  objections?: string[];
  interests?: string[];
  competitors?: string[];
  nextSteps?: string[];
}

export interface DetectedIntent {
  primary: IntentType;
  secondary?: IntentType;
  confidence: number;
  entities: Record<string, string | number | boolean>;
}

export type IntentType = 
  | 'provide_info'
  | 'ask_question'
  | 'show_interest'
  | 'express_concern'
  | 'request_meeting'
  | 'decline'
  | 'defer'
  | 'comparison'
  | 'price_inquiry'
  | 'feature_question'
  | 'timeline_info'
  | 'other';

// ============================================
// RESPONSE GENERATION
// ============================================

interface ResponseContext {
  lead: Lead;
  conversation: QualificationConversation;
  lastMessage: string;
  intent: DetectedIntent;
}

export interface GeneratedResponse {
  message: string;
  followUpQuestion?: string;
  suggestedTopic?: QualificationConversation['currentTopic'];
  shouldEndConversation?: boolean;
  callToAction?: 'schedule_meeting' | 'send_info' | 'follow_up' | 'handoff';
}

// ============================================
// QUALIFICATION CONVERSATION MANAGER
// ============================================

export class QualificationConversationManager {
  private conversations: Map<string, QualificationConversation> = new Map();

  constructor() {}

  /**
   * Start a new qualification conversation
   */
  startConversation(
    leadId: string,
    sdrEmployeeId: string,
    initialQuestions?: QualificationQuestion[]
  ): QualificationConversation {
    const id = `conv_${Date.now()}_${leadId}`;

    const conversation: QualificationConversation = {
      id,
      leadId,
      sdrEmployeeId,
      status: 'active',
      startedAt: new Date(),
      turns: [],
      extractedInfo: {},
      currentTopic: 'general',
      questionsAsked: [],
      nextQuestions: initialQuestions || [],
    };

    this.conversations.set(id, conversation);

    logger.info('Qualification conversation started', {
      conversationId: id,
      leadId,
    });

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  getConversation(id: string): QualificationConversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Get conversation for lead
   */
  getLeadConversation(leadId: string): QualificationConversation | undefined {
    for (const conv of this.conversations.values()) {
      if (conv.leadId === leadId && conv.status === 'active') {
        return conv;
      }
    }
    return undefined;
  }

  /**
   * Process incoming message from lead
   */
  async processLeadMessage(
    conversationId: string,
    message: string
  ): Promise<{
    intent: DetectedIntent;
    extractedInfo: ExtractedQualificationInfo;
    suggestedResponse: GeneratedResponse;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Detect intent
    const intent = this.detectIntent(message, conversation);

    // Extract qualification info from message
    const extractedInfo = this.extractQualificationInfo(message, intent, conversation);

    // Add turn to conversation
    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      role: 'lead',
      message,
      timestamp: new Date(),
      intent,
      extractedData: extractedInfo,
      sentiment: this.analyzeSentiment(message),
      confidenceScore: intent.confidence,
    };
    conversation.turns.push(turn);

    // Merge extracted info
    this.mergeExtractedInfo(conversation, extractedInfo);

    // Generate suggested response
    const suggestedResponse = this.generateResponse({
      lead: { id: conversation.leadId } as Lead, // Would be fetched in real impl
      conversation,
      lastMessage: message,
      intent,
    });

    // Update conversation state
    this.updateConversationState(conversation, intent);

    logger.info('Lead message processed', {
      conversationId,
      intent: intent.primary,
      sentiment: turn.sentiment,
    });

    return {
      intent,
      extractedInfo,
      suggestedResponse,
    };
  }

  /**
   * Record SDR response
   */
  recordSDRResponse(conversationId: string, message: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    const turn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      role: 'sdr',
      message,
      timestamp: new Date(),
    };

    conversation.turns.push(turn);

    // Track questions asked
    const questionPatterns = [/\?$/, /what|how|when|why|who|can you|do you|would you/i];
    if (questionPatterns.some(p => p.test(message))) {
      conversation.questionsAsked.push(message);
    }
  }

  /**
   * Detect intent from message
   */
  private detectIntent(message: string, conversation: QualificationConversation): DetectedIntent {
    const messageLower = message.toLowerCase();

    // Intent detection rules
    const intents: Array<{ type: IntentType; patterns: RegExp[]; weight: number }> = [
      {
        type: 'request_meeting',
        patterns: [
          /schedule|book|calendar|call|meeting|demo|talk|discuss/i,
          /available|free|time/i,
        ],
        weight: 0.9,
      },
      {
        type: 'price_inquiry',
        patterns: [
          /price|pricing|cost|how much|budget|investment|fee/i,
          /pay|afford|expensive|cheap/i,
        ],
        weight: 0.85,
      },
      {
        type: 'show_interest',
        patterns: [
          /interested|curious|tell me more|sounds good|like to know/i,
          /intrigued|appealing|promising/i,
        ],
        weight: 0.8,
      },
      {
        type: 'decline',
        patterns: [
          /not interested|no thanks|don't need|unsubscribe|remove|stop/i,
          /pass|skip|decline/i,
        ],
        weight: 0.95,
      },
      {
        type: 'defer',
        patterns: [
          /not now|later|busy|maybe|next quarter|next year/i,
          /timing|bad time|reach out later/i,
        ],
        weight: 0.8,
      },
      {
        type: 'comparison',
        patterns: [
          /competitor|alternative|compared to|versus|vs\.|different from/i,
          /other options|already using|current solution/i,
        ],
        weight: 0.85,
      },
      {
        type: 'feature_question',
        patterns: [
          /does it|can it|support|integrate|feature|capability/i,
          /how does|what about|include/i,
        ],
        weight: 0.7,
      },
      {
        type: 'timeline_info',
        patterns: [
          /looking to|planning|timeline|by when|deadline|target/i,
          /quarter|month|year|weeks/i,
        ],
        weight: 0.75,
      },
      {
        type: 'express_concern',
        patterns: [
          /concern|worried|problem|issue|challenge|difficult/i,
          /frustrated|struggling|pain|headache/i,
        ],
        weight: 0.75,
      },
      {
        type: 'ask_question',
        patterns: [/\?$/],
        weight: 0.6,
      },
    ];

    let bestIntent: IntentType = 'provide_info';
    let bestConfidence = 0;
    const entities: Record<string, string | number | boolean> = {};

    for (const { type, patterns, weight } of intents) {
      const matches = patterns.filter(p => p.test(messageLower));
      const matchScore = (matches.length / patterns.length) * weight;

      if (matchScore > bestConfidence) {
        bestConfidence = matchScore;
        bestIntent = type;
      }
    }

    // Extract entities
    this.extractEntities(messageLower, entities);

    return {
      primary: bestIntent,
      confidence: Math.min(bestConfidence, 0.95),
      entities,
    };
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string, entities: Record<string, string | number | boolean>): void {
    // Extract budget mentions
    const budgetMatch = message.match(/\$?([\d,]+)k?|\b(\d+)\s*(thousand|million|k|m)\b/i);
    if (budgetMatch) {
      entities.budgetMention = budgetMatch[0];
    }

    // Extract timeline mentions
    const timelineMatch = message.match(/(\d+)\s*(days?|weeks?|months?|quarters?|years?)/i);
    if (timelineMatch) {
      entities.timeline = timelineMatch[0];
    }

    // Extract company size mentions
    const sizeMatch = message.match(/(\d+)\s*(employees?|people|team members?)/i);
    if (sizeMatch) {
      entities.companySize = sizeMatch[0];
    }

    // Extract decision maker mentions
    if (/i('m| am) the|i make|my decision|i decide/i.test(message)) {
      entities.isDecisionMaker = true;
    }

    // Extract urgency indicators
    if (/urgent|asap|immediately|critical|priority/i.test(message)) {
      entities.urgency = 'high';
    }
  }

  /**
   * Extract qualification info from message
   */
  private extractQualificationInfo(
    message: string,
    intent: DetectedIntent,
    conversation: QualificationConversation
  ): ExtractedQualificationInfo {
    const info: ExtractedQualificationInfo = {};
    const messageLower = message.toLowerCase();

    // Budget extraction
    if (intent.entities.budgetMention || conversation.currentTopic === 'budget') {
      info.budget = {
        hasBudget: !(/no budget|don't have budget|not allocated/i.test(message)),
        budgetRange: intent.entities.budgetMention as string,
        score: 0,
      };
      
      if (info.budget.hasBudget) {
        info.budget.score = 15;
        if (info.budget.budgetRange) info.budget.score += 5;
      }
    }

    // Authority extraction
    if (intent.entities.isDecisionMaker || conversation.currentTopic === 'authority') {
      info.authority = {
        isDecisionMaker: intent.entities.isDecisionMaker as boolean || null,
        score: 0,
      };

      if (info.authority.isDecisionMaker) {
        info.authority.score = 20;
      }

      // Extract other decision makers
      const dmMatch = message.match(/(?:talk to|involve|bring in)\s+(?:my |the )?([\w\s,]+)/i);
      if (dmMatch && dmMatch[1]) {
        info.authority.decisionMakers = [dmMatch[1].trim()];
        info.authority.score = Math.max(info.authority.score ?? 0, 10);
      }
    }

    // Need extraction
    if (intent.primary === 'express_concern' || conversation.currentTopic === 'need') {
      info.need = {
        hasNeed: true,
        painPoints: [],
        score: 0,
      };

      // Extract pain points
      const painPhrases = [
        /struggling with ([\w\s]+)/i,
        /problem with ([\w\s]+)/i,
        /challenge is ([\w\s]+)/i,
        /need to ([\w\s]+)/i,
        /want to ([\w\s]+)/i,
      ];

      for (const pattern of painPhrases) {
        const match = message.match(pattern);
        if (match && match[1] && info.need.painPoints) {
          info.need.painPoints.push(match[1].trim());
        }
      }

      if (info.need.painPoints && info.need.painPoints.length > 0) {
        info.need.score = 10 + Math.min(info.need.painPoints.length * 3, 10);
      }

      // Extract urgency
      if (intent.entities.urgency === 'high') {
        info.need.needUrgency = 'high';
        info.need.score = Math.max(info.need.score ?? 0, 15);
      }
    }

    // Timeline extraction
    if (intent.entities.timeline || intent.primary === 'timeline_info' || conversation.currentTopic === 'timeline') {
      info.timeline = {
        hasTimeline: true,
        purchaseTimeframe: intent.entities.timeline as string,
        score: 10,
      };

      if (info.timeline.purchaseTimeframe) {
        if (/30 days?|this month|immediate/i.test(info.timeline.purchaseTimeframe)) {
          info.timeline.score = 20;
        } else if (/90 days?|this quarter/i.test(info.timeline.purchaseTimeframe)) {
          info.timeline.score = 15;
        }
      }
    }

    // Competitor extraction
    const competitorPatterns = [
      /using ([\w\s]+) right now/i,
      /looked at ([\w\s]+)/i,
      /compared to ([\w\s]+)/i,
    ];

    for (const pattern of competitorPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        if (!info.competitors) info.competitors = [];
        info.competitors.push(match[1].trim());
      }
    }

    // Interest extraction
    if (intent.primary === 'show_interest' || intent.primary === 'feature_question') {
      if (!info.interests) info.interests = [];
      
      const interestMatch = message.match(/interested in ([\w\s]+)/i);
      if (interestMatch && interestMatch[1]) {
        info.interests.push(interestMatch[1].trim());
      }
    }

    // Objection extraction
    if (intent.primary === 'decline' || intent.primary === 'defer') {
      if (!info.objections) info.objections = [];
      info.objections.push(message);
    }

    return info;
  }

  /**
   * Analyze sentiment of message
   */
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const messageLower = message.toLowerCase();

    const positivePatterns = [
      /great|excellent|love|interested|excited|perfect|amazing|wonderful/i,
      /yes|sure|absolutely|definitely|sounds good|let's/i,
    ];

    const negativePatterns = [
      /not interested|no thanks|stop|unsubscribe|remove|annoying/i,
      /bad|terrible|awful|waste|frustrated|angry/i,
    ];

    const positiveScore = positivePatterns.filter(p => p.test(messageLower)).length;
    const negativeScore = negativePatterns.filter(p => p.test(messageLower)).length;

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Generate suggested response
   */
  private generateResponse(context: ResponseContext): GeneratedResponse {
    const { intent, conversation } = context;

    // Response templates based on intent
    switch (intent.primary) {
      case 'request_meeting':
        return {
          message: `Great! I'd be happy to schedule a call. I have availability this week - would any of the following times work for you?`,
          callToAction: 'schedule_meeting',
          shouldEndConversation: false,
        };

      case 'price_inquiry':
        return {
          message: `Happy to discuss pricing! Our plans start at [X] and scale based on your needs. To give you the most accurate quote, I'd love to understand your requirements better. Can you tell me a bit about your team size and primary use case?`,
          followUpQuestion: 'What are the main challenges you\'re looking to solve?',
          suggestedTopic: 'need',
        };

      case 'show_interest':
        return {
          message: `That's great to hear! I'd love to learn more about what you're looking for. What challenges are you currently facing that led you to explore solutions like ours?`,
          suggestedTopic: 'need',
        };

      case 'decline':
        return {
          message: `I completely understand. May I ask what's driving that decision? I want to make sure we're being helpful and not just adding noise to your inbox.`,
          shouldEndConversation: false,
        };

      case 'defer':
        return {
          message: `Totally understand - timing is everything. Would it be helpful if I reached out again in [timeframe]? In the meantime, I can send over some resources that might be useful when you're ready.`,
          callToAction: 'follow_up',
        };

      case 'comparison':
        return {
          message: `Great question! We often get compared to [competitor]. The main differences are [X, Y, Z]. What's most important to you in making this decision?`,
          suggestedTopic: 'need',
        };

      case 'express_concern':
        return {
          message: `I hear you - that sounds frustrating. Many of our customers were in a similar situation before working with us. Can you tell me more about how this is impacting your day-to-day?`,
          suggestedTopic: 'need',
          followUpQuestion: 'What would an ideal solution look like for you?',
        };

      case 'timeline_info':
        return {
          message: `Thanks for sharing that timeline. To make sure we can meet your deadline, let me understand your evaluation process. Who else would need to be involved in the decision?`,
          suggestedTopic: 'authority',
        };

      default:
        return this.getNextTopicQuestion(conversation);
    }
  }

  /**
   * Get next topic question
   */
  private getNextTopicQuestion(conversation: QualificationConversation): GeneratedResponse {
    // Determine what we still need to know
    const { extractedInfo, currentTopic } = conversation;

    if (!extractedInfo.need?.painPoints?.length) {
      return {
        message: `I'd love to understand your current situation better. What are the main challenges you're facing right now?`,
        suggestedTopic: 'need',
      };
    }

    if (!extractedInfo.budget?.hasBudget) {
      return {
        message: `To make sure I can tailor my recommendations, do you have budget allocated for this type of solution?`,
        suggestedTopic: 'budget',
      };
    }

    if (!extractedInfo.authority?.isDecisionMaker) {
      return {
        message: `Who else on your team would be involved in evaluating and deciding on a solution like this?`,
        suggestedTopic: 'authority',
      };
    }

    if (!extractedInfo.timeline?.purchaseTimeframe) {
      return {
        message: `What's your timeline for getting a solution in place?`,
        suggestedTopic: 'timeline',
      };
    }

    // All info gathered - suggest meeting
    return {
      message: `Based on what you've shared, I think we could be a great fit. Would you be open to a quick call to dive deeper and show you how we've helped similar companies?`,
      callToAction: 'schedule_meeting',
    };
  }

  /**
   * Merge extracted info into conversation
   */
  private mergeExtractedInfo(
    conversation: QualificationConversation,
    newInfo: ExtractedQualificationInfo
  ): void {
    const { extractedInfo } = conversation;

    if (newInfo.budget) {
      extractedInfo.budget = { ...extractedInfo.budget, ...newInfo.budget };
    }
    if (newInfo.authority) {
      extractedInfo.authority = { ...extractedInfo.authority, ...newInfo.authority };
    }
    if (newInfo.need) {
      extractedInfo.need = {
        ...extractedInfo.need,
        ...newInfo.need,
        painPoints: [
          ...(extractedInfo.need?.painPoints || []),
          ...(newInfo.need.painPoints || []),
        ],
      };
    }
    if (newInfo.timeline) {
      extractedInfo.timeline = { ...extractedInfo.timeline, ...newInfo.timeline };
    }
    if (newInfo.objections) {
      extractedInfo.objections = [
        ...(extractedInfo.objections || []),
        ...newInfo.objections,
      ];
    }
    if (newInfo.interests) {
      extractedInfo.interests = [
        ...(extractedInfo.interests || []),
        ...newInfo.interests,
      ];
    }
    if (newInfo.competitors) {
      extractedInfo.competitors = [
        ...(extractedInfo.competitors || []),
        ...newInfo.competitors,
      ];
    }
  }

  /**
   * Update conversation state
   */
  private updateConversationState(
    conversation: QualificationConversation,
    intent: DetectedIntent
  ): void {
    // Check if should end conversation
    if (intent.primary === 'decline') {
      conversation.status = 'abandoned';
      return;
    }

    // Check if qualification complete
    const info = conversation.extractedInfo;
    const hasAllInfo = !!(
      info.budget?.hasBudget !== undefined &&
      info.authority?.isDecisionMaker !== undefined &&
      info.need?.painPoints?.length &&
      info.timeline?.hasTimeline !== undefined
    );

    if (hasAllInfo) {
      conversation.status = 'completed';
      conversation.completedAt = new Date();
    }
  }

  /**
   * Complete conversation and return extracted info
   */
  completeConversation(conversationId: string): ExtractedQualificationInfo | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    conversation.status = 'completed';
    conversation.completedAt = new Date();

    logger.info('Qualification conversation completed', {
      conversationId,
      turnsCount: conversation.turns.length,
    });

    return conversation.extractedInfo;
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): string {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return 'Conversation not found';

    const { extractedInfo } = conversation;
    const lines: string[] = [];

    lines.push(`Qualification Conversation Summary`);
    lines.push(`Status: ${conversation.status}`);
    lines.push(`Turns: ${conversation.turns.length}`);
    lines.push('');

    if (extractedInfo.need?.painPoints?.length) {
      lines.push(`Pain Points: ${extractedInfo.need.painPoints.join(', ')}`);
    }

    if (extractedInfo.budget?.hasBudget !== undefined) {
      lines.push(`Budget: ${extractedInfo.budget.hasBudget ? 'Yes' : 'No'} ${extractedInfo.budget.budgetRange || ''}`);
    }

    if (extractedInfo.authority?.isDecisionMaker !== undefined) {
      lines.push(`Decision Maker: ${extractedInfo.authority.isDecisionMaker ? 'Yes' : 'No'}`);
    }

    if (extractedInfo.timeline?.purchaseTimeframe) {
      lines.push(`Timeline: ${extractedInfo.timeline.purchaseTimeframe}`);
    }

    if (extractedInfo.competitors?.length) {
      lines.push(`Competitors Mentioned: ${extractedInfo.competitors.join(', ')}`);
    }

    if (extractedInfo.objections?.length) {
      lines.push(`Objections: ${extractedInfo.objections.length}`);
    }

    return lines.join('\n');
  }
}

/**
 * Create qualification conversation manager
 */
export function createQualificationConversationManager(): QualificationConversationManager {
  return new QualificationConversationManager();
}

