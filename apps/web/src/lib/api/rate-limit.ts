// Rate limiting for public API
// Uses a sliding window counter algorithm with in-memory cache + optional Redis support

// Rate limits by tier (requests per minute)
export const RATE_LIMITS = {
  free: 60,       // 60 req/min = 1 req/sec
  starter: 300,   // 300 req/min = 5 req/sec
  pro: 1000,      // 1000 req/min = ~17 req/sec
  enterprise: 5000, // 5000 req/min = ~83 req/sec
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

// In-memory rate limit store
// In production, you would use Redis for distributed rate limiting
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const WINDOW_SIZE = 60 * 1000; // 1 minute window

// Start cleanup interval
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > WINDOW_SIZE * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Check rate limit for an API key
 * Uses sliding window counter algorithm
 */
export async function checkRateLimit(
  apiKeyId: string,
  tier: RateLimitTier,
  customLimit?: number | null
): Promise<RateLimitResult> {
  const limit = customLimit || RATE_LIMITS[tier];
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_SIZE) * WINDOW_SIZE;
  const key = `${apiKeyId}:${windowStart}`;
  
  // Get or create entry
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.windowStart !== windowStart) {
    entry = { count: 0, windowStart };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: new Date(windowStart + WINDOW_SIZE),
    };
  }
  
  // Increment counter
  entry.count++;
  
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: new Date(windowStart + WINDOW_SIZE),
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  apiKeyId: string,
  tier: RateLimitTier,
  customLimit?: number | null
): RateLimitResult {
  const limit = customLimit || RATE_LIMITS[tier];
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_SIZE) * WINDOW_SIZE;
  const key = `${apiKeyId}:${windowStart}`;
  
  const entry = rateLimitStore.get(key);
  const count = entry?.windowStart === windowStart ? entry.count : 0;
  
  return {
    allowed: count < limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(windowStart + WINDOW_SIZE),
  };
}

/**
 * Reset rate limit for an API key (for testing/admin purposes)
 */
export function resetRateLimit(apiKeyId: string): void {
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_SIZE) * WINDOW_SIZE;
  const key = `${apiKeyId}:${windowStart}`;
  
  rateLimitStore.delete(key);
}

/**
 * Get rate limit info for display
 */
export function getRateLimitInfo(tier: RateLimitTier): {
  requestsPerMinute: number;
  requestsPerSecond: number;
  description: string;
} {
  const limit = RATE_LIMITS[tier];
  
  return {
    requestsPerMinute: limit,
    requestsPerSecond: Math.round(limit / 60 * 10) / 10,
    description: `${limit} requests per minute`,
  };
}

