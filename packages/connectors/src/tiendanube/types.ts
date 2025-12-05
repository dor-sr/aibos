/**
 * Tiendanube API Types
 * Based on: https://tiendanube.github.io/api-documentation/
 */

// LatAm supported currencies
export type TiendanubeCurrency = 'ARS' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU' | 'USD';

// Supported countries
export type TiendanubeCountry = 'AR' | 'BR' | 'MX' | 'CL' | 'CO' | 'PE' | 'UY';

// Client configuration
export interface TiendanubeClientConfig {
  accessToken: string;
  storeId: string;
  userAgent?: string;
}

// OAuth configuration
export interface TiendanubeOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// OAuth token response
export interface TiendanubeTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  user_id: number;
}

// Store/Shop information
export interface TiendanubeStore {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  contact_email: string;
  business_id: string;
  business_name: string;
  business_address: string;
  blog: string | null;
  main_currency: TiendanubeCurrency;
  currencies: TiendanubeCurrency[];
  main_language: string;
  languages: string[];
  country: TiendanubeCountry;
  domains: string[];
  plan_name: string;
  created_at: string;
  updated_at: string;
}

// Customer
export interface TiendanubeCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  identification: string | null;
  note: string | null;
  default_address: TiendanubeAddress | null;
  addresses: TiendanubeAddress[];
  billing_name: string | null;
  billing_phone: string | null;
  billing_address: string | null;
  billing_number: string | null;
  billing_floor: string | null;
  billing_locality: string | null;
  billing_zipcode: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_country: string | null;
  extra: Record<string, unknown> | null;
  total_spent: string;
  total_spent_currency: TiendanubeCurrency;
  last_order_id: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Address
export interface TiendanubeAddress {
  id: number;
  address: string;
  city: string;
  province: string;
  zipcode: string;
  country: string;
  phone: string | null;
  name: string;
  floor: string | null;
  locality: string | null;
  number: string | null;
  created_at: string;
  updated_at: string;
  default: boolean;
}

// Product
export interface TiendanubeProduct {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  handle: Record<string, string>;
  attributes: TiendanubeProductAttribute[];
  published: boolean;
  free_shipping: boolean;
  requires_shipping: boolean;
  canonical_url: string;
  video_url: string | null;
  seo_title: Record<string, string>;
  seo_description: Record<string, string>;
  brand: string | null;
  created_at: string;
  updated_at: string;
  variants: TiendanubeVariant[];
  images: TiendanubeImage[];
  categories: TiendanubeCategory[];
  tags: string[];
}

// Product attribute
export interface TiendanubeProductAttribute {
  en: string;
  es?: string;
  pt?: string;
}

// Product variant
export interface TiendanubeVariant {
  id: number;
  image_id: number | null;
  product_id: number;
  position: number;
  price: string;
  compare_at_price: string | null;
  promotional_price: string | null;
  stock_management: boolean;
  stock: number | null;
  sku: string | null;
  barcode: string | null;
  weight: string | null;
  width: string | null;
  height: string | null;
  depth: string | null;
  values: TiendanubeVariantValue[];
  created_at: string;
  updated_at: string;
}

// Variant value
export interface TiendanubeVariantValue {
  en: string;
  es?: string;
  pt?: string;
}

// Product image
export interface TiendanubeImage {
  id: number;
  product_id: number;
  src: string;
  position: number;
  alt: string[];
  created_at: string;
  updated_at: string;
}

// Category
export interface TiendanubeCategory {
  id: number;
  name: Record<string, string>;
  description: Record<string, string>;
  handle: Record<string, string>;
  parent: number | null;
  subcategories: number[];
  google_shopping_category: string | null;
  created_at: string;
  updated_at: string;
}

// Order
export interface TiendanubeOrder {
  id: number;
  token: string;
  store_id: number;
  contact_email: string;
  contact_name: string;
  contact_phone: string;
  contact_identification: string | null;
  shipping_min_days: number | null;
  shipping_max_days: number | null;
  billing_name: string;
  billing_phone: string;
  billing_address: string;
  billing_number: string;
  billing_floor: string;
  billing_locality: string;
  billing_zipcode: string;
  billing_city: string;
  billing_province: string;
  billing_country: string;
  shipping_cost_owner: string;
  shipping_cost_customer: string;
  coupon: TiendanubeCoupon[];
  promotional_discount: TiendanubePromotionalDiscount;
  subtotal: string;
  discount: string;
  discount_coupon: string;
  discount_gateway: string;
  total: string;
  total_usd: string;
  checkout_enabled: boolean;
  weight: string;
  currency: TiendanubeCurrency;
  language: string;
  gateway: string;
  gateway_id: string | null;
  gateway_name: string | null;
  shipping: string;
  shipping_option: string;
  shipping_option_code: string | null;
  shipping_option_reference: string | null;
  shipping_pickup_details: string | null;
  shipping_tracking_number: string | null;
  shipping_tracking_url: string | null;
  shipping_store_branch_name: string | null;
  shipping_pickup_type: string;
  shipping_suboption: unknown[];
  extra: Record<string, unknown>;
  storefront: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: TiendanubeCompletedAt;
  next_action: string;
  payment_details: TiendanubePaymentDetails;
  attributes: unknown[];
  customer: TiendanubeOrderCustomer;
  products: TiendanubeOrderProduct[];
  number: number;
  cancel_reason: string | null;
  owner_note: string | null;
  cancelled_at: string | null;
  closed_at: string | null;
  read_at: string | null;
  status: TiendanubeOrderStatus;
  payment_status: TiendanubePaymentStatus;
  shipping_status: TiendanubeShippingStatus;
  shipped_at: string | null;
  paid_at: string | null;
  landing_url: string | null;
  client_details: TiendanubeClientDetails;
  app_id: number | null;
}

// Order status types
export type TiendanubeOrderStatus = 'open' | 'closed' | 'cancelled';
export type TiendanubePaymentStatus = 'pending' | 'authorized' | 'paid' | 'abandoned' | 'refunded' | 'voided';
export type TiendanubeShippingStatus = 'unpacked' | 'unfulfilled' | 'shipped' | 'delivered';

// Order product
export interface TiendanubeOrderProduct {
  id: number;
  depth: string | null;
  height: string | null;
  name: string;
  price: string;
  compare_at_price: string;
  product_id: number;
  image: TiendanubeImage;
  quantity: number;
  free_shipping: boolean;
  weight: string;
  width: string | null;
  variant_id: number;
  variant_values: string[];
  properties: unknown[];
  sku: string | null;
  barcode: string | null;
}

// Order customer
export interface TiendanubeOrderCustomer {
  id: number;
  name: string;
  email: string;
  identification: string | null;
  phone: string | null;
  note: string | null;
  default_address: TiendanubeAddress | null;
  addresses: TiendanubeAddress[];
  billing_name: string | null;
  billing_phone: string | null;
  billing_address: string | null;
  billing_number: string | null;
  billing_floor: string | null;
  billing_locality: string | null;
  billing_zipcode: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_country: string | null;
  extra: Record<string, unknown> | null;
  total_spent: string;
  total_spent_currency: TiendanubeCurrency;
  last_order_id: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Coupon
export interface TiendanubeCoupon {
  code: string;
  type: string;
  value: string;
}

// Promotional discount
export interface TiendanubePromotionalDiscount {
  id: number | null;
  store_id: number;
  order_id: number;
  created_at: string;
  total_discount_amount: string;
  contents: unknown[];
  promotions_applied: unknown[];
}

// Completed at
export interface TiendanubeCompletedAt {
  date: string;
  timezone_type: number;
  timezone: string;
}

// Payment details
export interface TiendanubePaymentDetails {
  method: string | null;
  credit_card_company: string | null;
  installments: number;
}

// Client details
export interface TiendanubeClientDetails {
  browser_ip: string | null;
  user_agent: string | null;
}

// Webhook event types
export type TiendanubeWebhookEvent =
  | 'order/created'
  | 'order/updated'
  | 'order/paid'
  | 'order/packed'
  | 'order/fulfilled'
  | 'order/cancelled'
  | 'product/created'
  | 'product/updated'
  | 'product/deleted'
  | 'category/created'
  | 'category/updated'
  | 'category/deleted'
  | 'app/uninstalled';

// Webhook payload
export interface TiendanubeWebhookPayload {
  store_id: number;
  event: TiendanubeWebhookEvent;
  id?: number;
}

// Webhook registration
export interface TiendanubeWebhook {
  id: number;
  url: string;
  event: TiendanubeWebhookEvent;
  created_at: string;
  updated_at: string;
}

// Sync options
export interface TiendanubeSyncOptions {
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  page?: number;
  perPage?: number;
}

// API response pagination
export interface TiendanubePaginatedResponse<T> {
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// Sync result extension
export interface TiendanubeSyncResult {
  orders: number;
  customers: number;
  products: number;
}
