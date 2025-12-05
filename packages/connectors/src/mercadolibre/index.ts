/**
 * MercadoLibre Connector Module
 */

// Main exports
export { MercadoLibreConnector } from './connector';
export { MercadoLibreClient } from './client';

// Sync functions
export { 
  syncMercadoLibreListings, 
  getInternalProductId as getMercadoLibreInternalProductId,
  processMercadoLibreListing,
  updateMercadoLibreListingStatus,
} from './listings';

export { 
  syncMercadoLibreOrders, 
  processMercadoLibreOrder,
  calculateNetRevenue,
} from './orders';

export { 
  syncMercadoLibreQuestions,
  processMercadoLibreQuestion,
  getQuestionStats,
  getUrgentQuestions,
  type QuestionStats,
} from './questions';

export {
  getShipmentDetails,
  syncShipmentStatus,
  processShipmentWebhook,
  getShippingStats,
  type ShippingStatusDetails,
  type ShippingStats,
} from './shipping';

// Webhook handlers
export {
  processMercadoLibreWebhook,
  verifyMercadoLibreWebhook,
  MERCADOLIBRE_WEBHOOK_TOPICS,
  isSupportedTopic,
  getTopicCategory,
  type MercadoLibreWebhookResult,
  type MercadoLibreWebhookConfig,
} from './webhooks';

// Types
export type {
  MercadoLibreSiteId,
  MercadoLibreCurrency,
  MercadoLibreClientConfig,
  MercadoLibreOAuthConfig,
  MercadoLibreTokenResponse,
  MercadoLibreUser,
  MercadoLibreSellerReputation,
  MercadoLibreItem,
  MercadoLibreSaleTerm,
  MercadoLibrePicture,
  MercadoLibreShipping,
  MercadoLibreAddress,
  MercadoLibreLocation,
  MercadoLibreAttribute,
  MercadoLibreVariation,
  MercadoLibreAttributeCombination,
  MercadoLibreOrder,
  MercadoLibreOrderStatus,
  MercadoLibreOrderItem,
  MercadoLibreVariationAttribute,
  MercadoLibrePayment,
  MercadoLibreOrderShipping,
  MercadoLibreBuyer,
  MercadoLibreShipment,
  MercadoLibreShipmentStatus,
  MercadoLibreStatusHistory,
  MercadoLibreShippingAddress,
  MercadoLibreShippingItem,
  MercadoLibreShippingOption,
  MercadoLibreQuestion,
  MercadoLibreAnswer,
  MercadoLibreNotification,
  MercadoLibreWebhookTopic,
  MercadoLibreSyncOptions,
  MercadoLibreSearchResponse,
  MercadoLibreOrdersResponse,
} from './types';
