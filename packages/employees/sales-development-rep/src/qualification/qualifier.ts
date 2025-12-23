/**
 * Lead Qualifier
 * 
 * Implements BANT-based lead qualification with intelligent scoring.
 */

import { createLogger } from '@aibos/core';
import type {
  Lead,
  BudgetInfo,
  AuthorityInfo,
  NeedInfo,
  TimelineInfo,
  QualificationCriteria,
  QualificationQuestion,
  QualificationStatus,
  CompanySize,
} from '../types';

const logger = createLogger('sdr:qualifier');

// ============================================
// QUALIFICATION CRITERIA DEFINITIONS
// ============================================

const DEFAULT_BUDGET_CRITERIA: QualificationCriteria = {
  id: 'budget',
  name: 'Budget',
  category: 'budget',
  weight: 0.25,
  questions: [
    {
      id: 'budget_q1',
      question: 'Do you have budget allocated for this type of solution?',
      type: 'yes_no',
      followUpQuestions: ['What is your approximate budget range?'],
      requiredForQualification: true,
    },
    {
      id: 'budget_q2',
      question: 'What is your timeline for making a budget decision?',
      type: 'open_ended',
      requiredForQualification: false,
    },
    {
      id: 'budget_q3',
      question: 'Who controls the budget for this initiative?',
      type: 'open_ended',
      requiredForQualification: false,
    },
  ],
  scoringRules: [
    { id: 'has_budget', condition: 'hasBudget === true', points: 15 },
    { id: 'budget_range_high', condition: 'budgetRange === "enterprise"', points: 10 },
    { id: 'budget_range_mid', condition: 'budgetRange === "mid-market"', points: 7 },
    { id: 'budget_range_low', condition: 'budgetRange === "startup"', points: 4 },
    { id: 'no_budget', condition: 'hasBudget === false', points: 0, disqualifying: false },
  ],
};

const DEFAULT_AUTHORITY_CRITERIA: QualificationCriteria = {
  id: 'authority',
  name: 'Authority',
  category: 'authority',
  weight: 0.25,
  questions: [
    {
      id: 'authority_q1',
      question: 'Are you the decision-maker for this purchase?',
      type: 'yes_no',
      followUpQuestions: ['Who else is involved in the decision?'],
      requiredForQualification: true,
    },
    {
      id: 'authority_q2',
      question: 'What does your evaluation process typically look like?',
      type: 'open_ended',
      requiredForQualification: false,
    },
    {
      id: 'authority_q3',
      question: 'Who would need to sign off on this purchase?',
      type: 'open_ended',
      requiredForQualification: false,
    },
  ],
  scoringRules: [
    { id: 'is_dm', condition: 'isDecisionMaker === true', points: 20 },
    { id: 'has_influence', condition: 'decisionMakers?.length > 0', points: 10 },
    { id: 'knows_process', condition: 'buyingProcess !== undefined', points: 5 },
  ],
};

const DEFAULT_NEED_CRITERIA: QualificationCriteria = {
  id: 'need',
  name: 'Need',
  category: 'need',
  weight: 0.30,
  questions: [
    {
      id: 'need_q1',
      question: 'What challenges are you trying to solve?',
      type: 'open_ended',
      requiredForQualification: true,
    },
    {
      id: 'need_q2',
      question: 'How are you currently handling this?',
      type: 'open_ended',
      requiredForQualification: false,
    },
    {
      id: 'need_q3',
      question: 'What would success look like for you?',
      type: 'open_ended',
      requiredForQualification: false,
    },
    {
      id: 'need_q4',
      question: 'How urgent is solving this problem?',
      type: 'multiple_choice',
      options: ['Critical - needs immediate attention', 'High - within next quarter', 'Medium - within next 6 months', 'Low - exploring options'],
      requiredForQualification: false,
    },
  ],
  scoringRules: [
    { id: 'has_pain', condition: 'painPoints?.length > 0', points: 15 },
    { id: 'urgent_critical', condition: 'needUrgency === "critical"', points: 10 },
    { id: 'urgent_high', condition: 'needUrgency === "high"', points: 7 },
    { id: 'urgent_medium', condition: 'needUrgency === "medium"', points: 4 },
    { id: 'has_current', condition: 'currentSolution !== undefined', points: 5 },
  ],
};

const DEFAULT_TIMELINE_CRITERIA: QualificationCriteria = {
  id: 'timeline',
  name: 'Timeline',
  category: 'timeline',
  weight: 0.20,
  questions: [
    {
      id: 'timeline_q1',
      question: 'When are you looking to have a solution in place?',
      type: 'open_ended',
      requiredForQualification: true,
    },
    {
      id: 'timeline_q2',
      question: 'What is driving this timeline?',
      type: 'open_ended',
      requiredForQualification: false,
    },
    {
      id: 'timeline_q3',
      question: 'Are there any hard deadlines we should be aware of?',
      type: 'open_ended',
      requiredForQualification: false,
    },
  ],
  scoringRules: [
    { id: 'has_timeline', condition: 'hasTimeline === true', points: 10 },
    { id: 'timeline_30', condition: 'purchaseTimeframe === "30_days"', points: 15 },
    { id: 'timeline_90', condition: 'purchaseTimeframe === "90_days"', points: 10 },
    { id: 'timeline_6mo', condition: 'purchaseTimeframe === "6_months"', points: 5 },
    { id: 'has_drivers', condition: 'timelineDrivers?.length > 0', points: 5 },
  ],
};

// ============================================
// COMPANY FIT SCORING
// ============================================

interface CompanyFitConfig {
  idealIndustries: string[];
  idealCompanySizes: CompanySize[];
  idealTitles: string[];
  industryWeight: number;
  sizeWeight: number;
  titleWeight: number;
}

const DEFAULT_COMPANY_FIT: CompanyFitConfig = {
  idealIndustries: ['technology', 'saas', 'ecommerce', 'fintech', 'healthcare'],
  idealCompanySizes: ['51-200', '201-500', '501-1000'],
  idealTitles: ['ceo', 'cto', 'cfo', 'vp', 'director', 'head', 'manager'],
  industryWeight: 0.3,
  sizeWeight: 0.3,
  titleWeight: 0.4,
};

// ============================================
// LEAD QUALIFIER CLASS
// ============================================

export interface LeadQualifierConfig {
  qualificationThreshold: number;
  autoDisqualifyBelow: number;
  companyFit: Partial<CompanyFitConfig>;
  customCriteria?: QualificationCriteria[];
}

export interface QualificationResult {
  score: number;
  status: QualificationStatus;
  breakdown: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
    companyFit: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextQuestions: QualificationQuestion[];
  isQualified: boolean;
}

export class LeadQualifier {
  private config: LeadQualifierConfig;
  private companyFit: CompanyFitConfig;
  private criteria: QualificationCriteria[];

  constructor(config?: Partial<LeadQualifierConfig>) {
    this.config = {
      qualificationThreshold: 60,
      autoDisqualifyBelow: 20,
      companyFit: {},
      ...config,
    };

    this.companyFit = {
      ...DEFAULT_COMPANY_FIT,
      ...this.config.companyFit,
    };

    this.criteria = [
      DEFAULT_BUDGET_CRITERIA,
      DEFAULT_AUTHORITY_CRITERIA,
      DEFAULT_NEED_CRITERIA,
      DEFAULT_TIMELINE_CRITERIA,
      ...(this.config.customCriteria || []),
    ];
  }

  /**
   * Qualify a lead based on all available information
   */
  qualify(lead: Lead): QualificationResult {
    const budgetScore = this.scoreBudget(lead.budgetInfo);
    const authorityScore = this.scoreAuthority(lead.authorityInfo);
    const needScore = this.scoreNeed(lead.needInfo);
    const timelineScore = this.scoreTimeline(lead.timelineInfo);
    const companyFitScore = this.scoreCompanyFit(lead);

    // Calculate weighted score
    const bantScore = (
      budgetScore * 0.25 +
      authorityScore * 0.25 +
      needScore * 0.30 +
      timelineScore * 0.20
    );

    // Final score includes company fit
    const finalScore = Math.round(bantScore * 0.7 + companyFitScore * 0.3);

    // Determine status
    let status: QualificationStatus;
    if (finalScore >= this.config.qualificationThreshold) {
      status = 'qualified';
    } else if (finalScore <= this.config.autoDisqualifyBelow) {
      status = 'disqualified';
    } else if (this.hasMinimumInfo(lead)) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }

    // Get strengths and weaknesses
    const { strengths, weaknesses } = this.analyzeBANT(
      budgetScore, authorityScore, needScore, timelineScore, companyFitScore
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      lead, budgetScore, authorityScore, needScore, timelineScore
    );

    // Get next questions to ask
    const nextQuestions = this.getNextQuestions(lead);

    const result: QualificationResult = {
      score: finalScore,
      status,
      breakdown: {
        budget: budgetScore,
        authority: authorityScore,
        need: needScore,
        timeline: timelineScore,
        companyFit: companyFitScore,
      },
      strengths,
      weaknesses,
      recommendations,
      nextQuestions,
      isQualified: status === 'qualified',
    };

    logger.info('Lead qualified', {
      leadId: lead.id,
      score: finalScore,
      status,
    });

    return result;
  }

  /**
   * Score budget information
   */
  private scoreBudget(info?: BudgetInfo): number {
    if (!info) return 0;

    let score = 0;

    if (info.hasBudget === true) {
      score += 15;

      if (info.budgetRange) {
        const range = info.budgetRange.toLowerCase();
        if (range.includes('enterprise') || range.includes('100k') || range.includes('1m')) {
          score += 10;
        } else if (range.includes('mid') || range.includes('50k') || range.includes('professional')) {
          score += 7;
        } else {
          score += 4;
        }
      }
    } else if (info.hasBudget === null) {
      score += 5; // Unknown is better than no
    }

    return Math.min(score, 25);
  }

  /**
   * Score authority information
   */
  private scoreAuthority(info?: AuthorityInfo): number {
    if (!info) return 0;

    let score = 0;

    if (info.isDecisionMaker === true) {
      score += 20;
    } else if (info.decisionMakers && info.decisionMakers.length > 0) {
      score += 10;
    }

    if (info.buyingProcess) {
      score += 5;
    }

    return Math.min(score, 25);
  }

  /**
   * Score need information
   */
  private scoreNeed(info?: NeedInfo): number {
    if (!info) return 0;

    let score = 0;

    if (info.hasNeed === true) {
      score += 10;
    }

    if (info.painPoints && info.painPoints.length > 0) {
      score += Math.min(info.painPoints.length * 3, 10);
    }

    switch (info.needUrgency) {
      case 'critical':
        score += 10;
        break;
      case 'high':
        score += 7;
        break;
      case 'medium':
        score += 4;
        break;
      case 'low':
        score += 1;
        break;
    }

    if (info.currentSolution) {
      score += 3;
    }

    return Math.min(score, 30);
  }

  /**
   * Score timeline information
   */
  private scoreTimeline(info?: TimelineInfo): number {
    if (!info) return 0;

    let score = 0;

    if (info.hasTimeline === true) {
      score += 5;
    }

    if (info.purchaseTimeframe) {
      const timeframe = info.purchaseTimeframe.toLowerCase();
      if (timeframe.includes('30') || timeframe.includes('immediate') || timeframe.includes('asap')) {
        score += 15;
      } else if (timeframe.includes('60') || timeframe.includes('90') || timeframe.includes('quarter')) {
        score += 10;
      } else if (timeframe.includes('6 month') || timeframe.includes('half year')) {
        score += 5;
      } else {
        score += 2;
      }
    }

    if (info.timelineDrivers && info.timelineDrivers.length > 0) {
      score += 5;
    }

    return Math.min(score, 25);
  }

  /**
   * Score company fit
   */
  private scoreCompanyFit(lead: Lead): number {
    let score = 0;
    let totalWeight = 0;

    // Industry fit
    if (lead.industry) {
      totalWeight += this.companyFit.industryWeight;
      const industry = lead.industry.toLowerCase();
      if (this.companyFit.idealIndustries.some(i => industry.includes(i.toLowerCase()))) {
        score += 100 * this.companyFit.industryWeight;
      } else {
        score += 50 * this.companyFit.industryWeight; // Partial credit
      }
    }

    // Company size fit
    if (lead.companySize) {
      totalWeight += this.companyFit.sizeWeight;
      if (this.companyFit.idealCompanySizes.includes(lead.companySize)) {
        score += 100 * this.companyFit.sizeWeight;
      } else {
        score += 40 * this.companyFit.sizeWeight;
      }
    }

    // Title fit
    if (lead.title) {
      totalWeight += this.companyFit.titleWeight;
      const title = lead.title.toLowerCase();
      if (this.companyFit.idealTitles.some(t => title.includes(t))) {
        score += 100 * this.companyFit.titleWeight;
      } else {
        score += 30 * this.companyFit.titleWeight;
      }
    }

    // Normalize score
    if (totalWeight > 0) {
      return Math.round(score / totalWeight);
    }

    return 50; // Default if no info
  }

  /**
   * Analyze BANT scores for strengths and weaknesses
   */
  private analyzeBANT(
    budget: number,
    authority: number,
    need: number,
    timeline: number,
    companyFit: number
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (budget >= 20) strengths.push('Strong budget indication');
    else if (budget < 10) weaknesses.push('Budget unclear or limited');

    if (authority >= 15) strengths.push('Decision-maker or strong influence');
    else if (authority < 10) weaknesses.push('Decision-making authority unclear');

    if (need >= 20) strengths.push('Clear pain points and urgent need');
    else if (need < 10) weaknesses.push('Need not clearly established');

    if (timeline >= 15) strengths.push('Active buying timeline');
    else if (timeline < 5) weaknesses.push('No clear timeline');

    if (companyFit >= 70) strengths.push('Excellent company fit');
    else if (companyFit < 40) weaknesses.push('Company fit concerns');

    return { strengths, weaknesses };
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(
    lead: Lead,
    budget: number,
    authority: number,
    need: number,
    timeline: number
  ): string[] {
    const recommendations: string[] = [];

    if (budget < 10) {
      recommendations.push('Discovery call to understand budget situation');
    }

    if (authority < 10) {
      recommendations.push('Identify and engage decision-makers');
    }

    if (need < 15) {
      recommendations.push('Deeper discovery on pain points and use cases');
    }

    if (timeline < 10) {
      recommendations.push('Understand timeline drivers and create urgency');
    }

    if (lead.totalTouchpoints === 0) {
      recommendations.push('Initial outreach with value proposition');
    }

    if (lead.totalTouchpoints > 5 && !lead.lastResponseAt) {
      recommendations.push('Try different channel or messaging approach');
    }

    return recommendations;
  }

  /**
   * Get next questions to ask based on missing info
   */
  private getNextQuestions(lead: Lead): QualificationQuestion[] {
    const questions: QualificationQuestion[] = [];

    for (const criterion of this.criteria) {
      const info = this.getInfoForCriterion(lead, criterion.category);
      
      for (const question of criterion.questions) {
        if (question.requiredForQualification && !this.hasAnsweredQuestion(info, question)) {
          questions.push(question);
        }
      }
    }

    // Limit to top 3 questions
    return questions.slice(0, 3);
  }

  /**
   * Get BANT info for criterion
   */
  private getInfoForCriterion(
    lead: Lead, 
    category: string
  ): BudgetInfo | AuthorityInfo | NeedInfo | TimelineInfo | undefined {
    switch (category) {
      case 'budget':
        return lead.budgetInfo;
      case 'authority':
        return lead.authorityInfo;
      case 'need':
        return lead.needInfo;
      case 'timeline':
        return lead.timelineInfo;
      default:
        return undefined;
    }
  }

  /**
   * Check if question has been answered
   */
  private hasAnsweredQuestion(
    info: BudgetInfo | AuthorityInfo | NeedInfo | TimelineInfo | undefined,
    question: QualificationQuestion
  ): boolean {
    if (!info) return false;

    // Check based on question type
    if (question.type === 'yes_no') {
      const key = question.id.includes('budget') ? 'hasBudget' :
                  question.id.includes('authority') ? 'isDecisionMaker' :
                  question.id.includes('need') ? 'hasNeed' :
                  'hasTimeline';
      const infoRecord = info as unknown as Record<string, unknown>;
      return infoRecord[key] !== null && infoRecord[key] !== undefined;
    }

    return info.score > 0;
  }

  /**
   * Check if lead has minimum qualification info
   */
  private hasMinimumInfo(lead: Lead): boolean {
    return !!(
      lead.budgetInfo?.score ||
      lead.authorityInfo?.score ||
      lead.needInfo?.score ||
      lead.timelineInfo?.score
    );
  }

  /**
   * Quick score for lead prioritization
   */
  quickScore(lead: Lead): number {
    // Fast scoring without full qualification
    let score = 0;

    // Source scoring
    switch (lead.source) {
      case 'demo_request':
        score += 30;
        break;
      case 'free_trial':
        score += 25;
        break;
      case 'content_download':
        score += 15;
        break;
      case 'referral':
        score += 20;
        break;
      case 'cold_outbound':
        score += 5;
        break;
      default:
        score += 10;
    }

    // Engagement scoring
    if (lead.emailsOpened > 0) score += 10;
    if (lead.emailsClicked > 0) score += 15;
    if (lead.lastResponseAt) score += 20;

    // Company fit quick check
    if (lead.companySize && this.companyFit.idealCompanySizes.includes(lead.companySize)) {
      score += 15;
    }

    if (lead.title) {
      const title = lead.title.toLowerCase();
      if (this.companyFit.idealTitles.some(t => title.includes(t))) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Get qualification criteria
   */
  getCriteria(): QualificationCriteria[] {
    return this.criteria;
  }

  /**
   * Update company fit config
   */
  updateCompanyFit(config: Partial<CompanyFitConfig>): void {
    this.companyFit = { ...this.companyFit, ...config };
  }
}

/**
 * Create a lead qualifier instance
 */
export function createLeadQualifier(config?: Partial<LeadQualifierConfig>): LeadQualifier {
  return new LeadQualifier(config);
}

