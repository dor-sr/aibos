/**
 * Webhook Verifiers
 * Provider-specific signature verification implementations
 */

import type { WebhookProvider, WebhookVerifier } from '../types';
import { stripeVerifier } from './stripe';
import { shopifyVerifier } from './shopify';

// Registry of all verifiers
const verifiers = new Map<WebhookProvider, WebhookVerifier>();
verifiers.set('stripe', stripeVerifier);
verifiers.set('shopify', shopifyVerifier);

/**
 * Get the verifier for a provider
 */
export function getVerifier(provider: WebhookProvider): WebhookVerifier | undefined {
  return verifiers.get(provider);
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): provider is WebhookProvider {
  return verifiers.has(provider as WebhookProvider);
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): WebhookProvider[] {
  return Array.from(verifiers.keys());
}

export { stripeVerifier } from './stripe';
export { shopifyVerifier } from './shopify';


