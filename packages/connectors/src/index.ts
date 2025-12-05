// Connectors package - main exports
export * from './types';
export * from './base';

// Shopify connector exports
export {
  ShopifyConnector,
  ShopifyClient,
  syncOrders,
  syncProducts,
  syncCustomers,
  type ShopifyClientConfig,
  type ShopifyShop,
  type ShopifyOrder,
  type ShopifyProduct,
  type ShopifyCustomer,
  type ShopifyOrdersResponse,
  type ShopifyProductsResponse,
  type ShopifyCustomersResponse,
  type ShopifyLineItem,
  type ShopifyVariant,
  type ListOrdersParams as ShopifyListOrdersParams,
  type ListProductsParams as ShopifyListProductsParams,
  type ListCustomersParams as ShopifyListCustomersParams,
} from './shopify';

// Stripe connector exports
export {
  StripeConnector,
  StripeClient,
  syncStripeCustomers,
  syncStripePlans,
  syncStripeSubscriptions,
  syncStripeInvoices,
  processWebhookEvent,
  STRIPE_WEBHOOK_EVENTS,
  processCustomer as processStripeCustomer,
  processInvoice as processStripeInvoice,
  processSubscription as processStripeSubscription,
  processPlan as processStripePlan,
  getInternalCustomerId as getStripeInternalCustomerId,
  getInternalPlanId as getStripeInternalPlanId,
  getInternalSubscriptionId as getStripeInternalSubscriptionId,
  getInternalInvoiceId as getStripeInternalInvoiceId,
  deleteCustomerByExternalId as deleteStripeCustomer,
  deactivatePlan as deactivateStripePlan,
  cancelSubscription as cancelStripeSubscription,
  markInvoicePaid as markStripeInvoicePaid,
  markInvoiceVoid as markStripeInvoiceVoid,
  // Metrics
  calculateMRR,
  calculateARR,
  calculateMRRBreakdown,
  getSubscriptionMetrics,
  getCustomerMetrics,
  getRevenueForPeriod,
  type StripeClientConfig,
  type StripeListCustomersParams,
  type StripeListPricesParams,
  type StripeListSubscriptionsParams,
  type StripeListInvoicesParams,
  type WebhookProcessingResult,
  type MRRResult,
  type ARRResult,
  type SubscriptionMetrics,
  type CustomerMetrics,
  type Stripe,
} from './stripe';

// Webhook Gateway exports
export {
  // Gateway
  webhookGateway,
  WebhookGateway,
  type WebhookGatewayResult,
  // Types
  type WebhookProvider,
  type ParsedWebhookEvent,
  type WebhookVerifier,
  type WebhookEventProcessor,
  type VerificationResult,
  type WebhookGatewayConfig,
  DEFAULT_GATEWAY_CONFIG,
  // Verifiers
  getVerifier,
  isProviderSupported,
  getSupportedProviders,
  stripeVerifier,
  shopifyVerifier,
  // Processors
  getEventProcessor,
  getSupportedEvents,
  stripeProcessor,
  shopifyProcessor,
  STRIPE_SUPPORTED_EVENTS,
  SHOPIFY_SUPPORTED_EVENTS,
} from './webhooks';
