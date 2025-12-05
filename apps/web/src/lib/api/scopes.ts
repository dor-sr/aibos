// API Scopes definition for public API access control

export const API_SCOPES = {
  // Read scopes
  'read:metrics': {
    description: 'Read metrics and analytics data',
    category: 'analytics',
  },
  'read:reports': {
    description: 'Read generated reports',
    category: 'analytics',
  },
  'read:insights': {
    description: 'Read AI-generated insights',
    category: 'analytics',
  },
  'read:anomalies': {
    description: 'Read detected anomalies',
    category: 'analytics',
  },
  'read:workspace': {
    description: 'Read workspace information',
    category: 'workspace',
  },
  'read:connectors': {
    description: 'Read connector configurations',
    category: 'connectors',
  },
  'read:customers': {
    description: 'Read customer data',
    category: 'data',
  },
  'read:orders': {
    description: 'Read order data',
    category: 'data',
  },
  'read:products': {
    description: 'Read product data',
    category: 'data',
  },
  'read:subscriptions': {
    description: 'Read subscription data',
    category: 'data',
  },
  
  // Write scopes
  'write:webhooks': {
    description: 'Create and manage outbound webhooks',
    category: 'webhooks',
  },
  'write:connectors': {
    description: 'Trigger connector syncs',
    category: 'connectors',
  },
  
  // NLQ scopes
  'nlq:query': {
    description: 'Send natural language queries',
    category: 'nlq',
  },
  
  // Admin scopes
  'admin:api_keys': {
    description: 'Manage API keys',
    category: 'admin',
  },
  'admin:workspace': {
    description: 'Manage workspace settings',
    category: 'admin',
  },
} as const;

export type ApiScope = keyof typeof API_SCOPES;

// Scope categories
export const SCOPE_CATEGORIES = {
  analytics: 'Analytics & Reports',
  workspace: 'Workspace',
  connectors: 'Connectors',
  data: 'Data Access',
  webhooks: 'Webhooks',
  nlq: 'Natural Language Queries',
  admin: 'Administration',
} as const;

// Default scopes for different tier levels
export const DEFAULT_SCOPES_BY_TIER = {
  free: [
    'read:metrics',
    'read:reports',
    'read:workspace',
  ] as ApiScope[],
  starter: [
    'read:metrics',
    'read:reports',
    'read:insights',
    'read:anomalies',
    'read:workspace',
    'read:connectors',
    'nlq:query',
  ] as ApiScope[],
  pro: [
    'read:metrics',
    'read:reports',
    'read:insights',
    'read:anomalies',
    'read:workspace',
    'read:connectors',
    'read:customers',
    'read:orders',
    'read:products',
    'read:subscriptions',
    'write:webhooks',
    'write:connectors',
    'nlq:query',
  ] as ApiScope[],
  enterprise: Object.keys(API_SCOPES) as ApiScope[],
} as const;

// Check if a scope is valid
export function isValidScope(scope: string): scope is ApiScope {
  return scope in API_SCOPES;
}

// Get scopes by category
export function getScopesByCategory(category: keyof typeof SCOPE_CATEGORIES): ApiScope[] {
  return (Object.entries(API_SCOPES) as [ApiScope, typeof API_SCOPES[ApiScope]][])
    .filter(([_, config]) => config.category === category)
    .map(([scope]) => scope);
}

// Check if scopes include required scope
export function hasScope(userScopes: string[], requiredScope: ApiScope): boolean {
  return userScopes.includes(requiredScope);
}

// Check if scopes include any of the required scopes
export function hasAnyScope(userScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some(scope => userScopes.includes(scope));
}

// Check if scopes include all required scopes
export function hasAllScopes(userScopes: string[], requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => userScopes.includes(scope));
}

