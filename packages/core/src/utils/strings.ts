/**
 * Generate a URL-safe slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to title case
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Generate a random ID
 */
export function generateId(lengthOrKey: number | string = 12): string {
  // If a string key is provided, generate a deterministic hash-based ID
  if (typeof lengthOrKey === 'string') {
    return generateHashId(lengthOrKey);
  }
  
  // Otherwise generate a random ID of specified length
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < lengthOrKey; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a deterministic hash-based ID from a key
 * Uses a simple hash function suitable for generating unique IDs
 */
export function generateHashId(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to base36 and ensure positive value
  const positiveHash = Math.abs(hash);
  const hashStr = positiveHash.toString(36);
  
  // Add a prefix and pad to ensure consistent length
  return `id_${hashStr.padStart(8, '0')}`;
}

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask sensitive data (e.g., API keys)
 */
export function maskString(text: string, visibleChars: number = 4): string {
  if (text.length <= visibleChars * 2) {
    return '*'.repeat(text.length);
  }
  const prefix = text.slice(0, visibleChars);
  const suffix = text.slice(-visibleChars);
  const masked = '*'.repeat(Math.min(text.length - visibleChars * 2, 10));
  return `${prefix}${masked}${suffix}`;
}



