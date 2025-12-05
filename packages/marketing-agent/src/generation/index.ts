/**
 * Creative Generation Module
 */

import { createLogger } from '@aibos/core';
import { createDefaultProvider, type LLMProviderInterface } from '@aibos/ai-runtime';
import { db } from '@aibos/data-model';
import { generatedCreatives } from '@aibos/data-model';
import type { CreativeRequest, CreativeAsset, MarketingChannel } from '../types';

const logger = createLogger('marketing-agent:generation');

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `creative_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get character limits for different platforms and types
 */
function getCharacterLimits(type: string, channel?: MarketingChannel): { min: number; max: number } {
  // Default limits
  const defaultLimits = { min: 20, max: 150 };
  
  // Type-specific limits
  const typeLimits: Record<string, { min: number; max: number }> = {
    headline: { min: 10, max: 50 },
    description: { min: 20, max: 150 },
    ad_copy: { min: 50, max: 400 },
    email_subject: { min: 20, max: 60 },
    cta: { min: 2, max: 20 },
  };
  
  // Channel-specific overrides for headlines
  if (type === 'headline' && channel) {
    if (channel === 'meta_ads') return { min: 10, max: 40 };
    if (channel === 'google_ads') return { min: 10, max: 30 };
    if (channel === 'linkedin_ads') return { min: 10, max: 70 };
  }
  
  // Channel-specific overrides for descriptions
  if (type === 'description' && channel) {
    if (channel === 'meta_ads') return { min: 20, max: 125 };
    if (channel === 'google_ads') return { min: 20, max: 90 };
    if (channel === 'linkedin_ads') return { min: 20, max: 300 };
  }
  
  // Channel-specific overrides for ad copy
  if (type === 'ad_copy' && channel) {
    if (channel === 'meta_ads') return { min: 50, max: 500 };
    if (channel === 'google_ads') return { min: 50, max: 300 };
    if (channel === 'linkedin_ads') return { min: 50, max: 600 };
  }
  
  return typeLimits[type] || defaultLimits;
}

/**
 * Build the prompt for creative generation
 */
function buildCreativePrompt(request: CreativeRequest): string {
  const limits = getCharacterLimits(request.type, request.channel);

  let prompt = `Generate ${request.count || 3} ${request.type.replace('_', ' ')}s for ${request.channel?.replace('_', ' ') || 'digital advertising'}.

Requirements:
- Each should be between ${limits.min} and ${limits.max} characters
- Tone: ${request.tone || 'professional'}
- Style: ${request.style || 'medium'} length`;

  if (request.product) {
    prompt += `\n- Product/Service: ${request.product}`;
  }

  if (request.audience) {
    prompt += `\n- Target Audience: ${request.audience}`;
  }

  if (request.keywords && request.keywords.length > 0) {
    prompt += `\n- Include keywords: ${request.keywords.join(', ')}`;
  }

  prompt += `

Guidelines:
- Make each variation unique and distinct
- Focus on benefits, not just features
- Include a clear value proposition
- Use active voice and action words
- Avoid cliches and generic phrases

Output format:
Return ONLY a JSON array of strings, with each string being one creative. Example:
["Creative 1 here", "Creative 2 here", "Creative 3 here"]`;

  return prompt;
}

/**
 * Parse the LLM response to extract creatives
 */
function parseCreativeResponse(response: string): string[] {
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string' && item.length > 0);
    }
  } catch {
    // Try to extract from markdown code block
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string' && item.length > 0);
        }
      } catch {
        // Continue to line-by-line parsing
      }
    }

    // Fall back to line-by-line parsing
    const lines = response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith('#') && !line.startsWith('//'))
      .map((line) => {
        // Remove numbering like "1." or "- "
        return line.replace(/^[\d\.\-\*\)]+\s*/, '').replace(/^["']|["']$/g, '');
      })
      .filter((line) => line.length > 10);

    if (lines.length > 0) {
      return lines;
    }
  }

  return [];
}

/**
 * Generate creative assets using AI
 */
export async function generateCreatives(
  workspaceId: string,
  request: CreativeRequest,
  provider?: LLMProviderInterface
): Promise<CreativeAsset[]> {
  logger.info('Generating creatives', { workspaceId, type: request.type, count: request.count });

  const llmProvider = provider || createDefaultProvider();
  const prompt = buildCreativePrompt(request);
  const limits = getCharacterLimits(request.type, request.channel);

  try {
    const response = await llmProvider.complete({
      messages: [
        {
          role: 'system',
          content: 'You are an expert digital marketing copywriter. Generate compelling ad copy that drives conversions. Always return valid JSON arrays.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.message.content;
    const creatives = parseCreativeResponse(content);

    if (creatives.length === 0) {
      logger.warn('No creatives parsed from response', { response: content });
      return getDemoCreatives(request);
    }

    const assets: CreativeAsset[] = [];

    for (const creative of creatives) {
      const id = generateId();

      // Store in database
      // Map channel to valid ad platform enum values (email/sms are not ad platforms)
      const validAdPlatforms = ['meta_ads', 'google_ads', 'tiktok_ads', 'linkedin_ads', 'twitter_ads', 'pinterest_ads'] as const;
      const platformValue = request.channel && validAdPlatforms.includes(request.channel as typeof validAdPlatforms[number])
        ? request.channel as typeof validAdPlatforms[number]
        : null;

      try {
        await db.insert(generatedCreatives).values({
          id,
          workspaceId,
          type: request.type,
          platform: platformValue,
          content: creative,
          prompt,
          metadata: {
            product: request.product,
            audience: request.audience,
            tone: request.tone,
            originalPrompt: prompt,
            model: 'gpt-4',
          },
        });
      } catch (dbError) {
        logger.warn('Failed to store creative in database', { error: (dbError as Error).message });
      }

      assets.push({
        id,
        type: request.type,
        content: creative,
        channel: request.channel,
        metadata: {
          characterCount: creative.length,
          keywords: request.keywords,
          tone: request.tone,
        },
        createdAt: new Date(),
      });
    }

    logger.info('Creatives generated', { count: assets.length });
    return assets;
  } catch (error) {
    logger.error('Failed to generate creatives', error as Error);
    // Return demo creatives as fallback
    return getDemoCreatives(request);
  }
}

/**
 * Get demo creatives when AI is unavailable
 */
function getDemoCreatives(request: CreativeRequest): CreativeAsset[] {
  const demos: Record<string, string[]> = {
    headline: [
      'Transform Your Business Today',
      'Discover the Difference Quality Makes',
      'Unlock Your Potential Now',
      'Results That Speak for Themselves',
      'Your Success Starts Here',
    ],
    description: [
      'Join thousands of satisfied customers who have already discovered the power of our solution. Start your journey today and see the difference quality can make.',
      'Our award-winning platform delivers results you can measure. With proven strategies and expert support, success is within reach.',
      'Stop settling for less. Our innovative approach combines cutting-edge technology with personalized service to deliver exceptional value.',
    ],
    ad_copy: [
      "Ready to take your business to the next level? Our comprehensive solution has helped thousands of companies achieve their goals. With industry-leading features and dedicated support, you'll have everything you need to succeed. Start your free trial today!",
      "Don't let another day go by without the tools you deserve. Our platform is designed for businesses like yours, delivering measurable results from day one. Join the revolution and see why we're the trusted choice for growing companies.",
      'What if you could accomplish more in less time? Our proven methodology has helped teams increase productivity by 40% on average. Schedule a demo and discover how we can transform your workflow.',
    ],
    email_subject: [
      "You're Missing Out on This...",
      '[Limited Time] Special Offer Inside',
      "Here's the strategy that changed everything",
      'Quick question about your goals',
      'The results are in...',
    ],
    cta: [
      'Get Started',
      'Learn More',
      'Try Free',
      'Shop Now',
      'Sign Up',
    ],
  };

  const typeCreatives = demos[request.type as keyof typeof demos] || demos.ad_copy;
  if (!typeCreatives) {
    return [];
  }
  const count = Math.min(request.count || 3, typeCreatives.length);

  return typeCreatives.slice(0, count).map((content, index) => ({
    id: `demo_${request.type}_${index}_${Date.now()}`,
    type: request.type,
    content,
    channel: request.channel,
    metadata: {
      characterCount: content.length,
      tone: request.tone,
    },
    createdAt: new Date(),
  }));
}

/**
 * Generate ad copy variations for A/B testing
 */
export async function generateAdVariations(
  workspaceId: string,
  baseRequest: CreativeRequest,
  variationCount = 3,
  provider?: LLMProviderInterface
): Promise<{
  headlines: CreativeAsset[];
  descriptions: CreativeAsset[];
  fullCopy: CreativeAsset[];
}> {
  const headlines = await generateCreatives(workspaceId, {
    ...baseRequest,
    type: 'headline',
    count: variationCount,
  }, provider);

  const descriptions = await generateCreatives(workspaceId, {
    ...baseRequest,
    type: 'description',
    count: variationCount,
  }, provider);

  const fullCopy = await generateCreatives(workspaceId, {
    ...baseRequest,
    type: 'ad_copy',
    count: variationCount,
  }, provider);

  return { headlines, descriptions, fullCopy };
}

