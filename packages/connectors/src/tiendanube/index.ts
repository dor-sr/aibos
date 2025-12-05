/**
 * Tiendanube Connector Module
 */

// Main exports
export { TiendanubeConnector, TIENDANUBE_SCOPES } from './connector';
export { TiendanubeClient } from './client';

// Sync functions
export { syncTiendanubeCustomers, getInternalCustomerId as getTiendanubeInternalCustomerId, processTiendanubeCustomer } from './customers';
export { syncTiendanubeProducts, getInternalProductId as getTiendanubeInternalProductId, processTiendanubeProduct, deleteTiendanubeProduct } from './products';
export { syncTiendanubeOrders, processTiendanubeOrder, cancelTiendanubeOrder } from './orders';

// Webhook handlers
export {
  processTiendanubeWebhook,
  verifyTiendanubeWebhook,
  TIENDANUBE_WEBHOOK_EVENTS,
  getEventCategory,
  isSupportedEvent as isTiendanubeEventSupported,
  type TiendanubeWebhookResult,
  type TiendanubeWebhookConfig,
} from './webhooks';

// Types
export type {
  TiendanubeCurrency,
  TiendanubeCountry,
  TiendanubeClientConfig,
  TiendanubeOAuthConfig,
  TiendanubeTokenResponse,
  TiendanubeStore,
  TiendanubeCustomer,
  TiendanubeAddress,
  TiendanubeProduct,
  TiendanubeProductAttribute,
  TiendanubeVariant,
  TiendanubeVariantValue,
  TiendanubeImage,
  TiendanubeCategory,
  TiendanubeOrder,
  TiendanubeOrderStatus,
  TiendanubePaymentStatus,
  TiendanubeShippingStatus,
  TiendanubeOrderProduct,
  TiendanubeOrderCustomer,
  TiendanubeCoupon,
  TiendanubePromotionalDiscount,
  TiendanubeCompletedAt,
  TiendanubePaymentDetails,
  TiendanubeClientDetails,
  TiendanubeWebhookEvent,
  TiendanubeWebhookPayload,
  TiendanubeWebhook,
  TiendanubeSyncOptions,
  TiendanubePaginatedResponse,
  TiendanubeSyncResult,
} from './types';
