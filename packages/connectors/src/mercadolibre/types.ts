/**
 * MercadoLibre API Types
 * Based on: https://developers.mercadolibre.com/
 */

// Supported site IDs (countries)
export type MercadoLibreSiteId = 
  | 'MLA' // Argentina
  | 'MLB' // Brazil
  | 'MLM' // Mexico
  | 'MLC' // Chile
  | 'MCO' // Colombia
  | 'MPE' // Peru
  | 'MLU' // Uruguay
  | 'MLV' // Venezuela
  | 'MEC' // Ecuador
  | 'MBO' // Bolivia
  | 'MPA' // Panama
  | 'MCR' // Costa Rica
  | 'MRD' // Dominican Republic
  | 'MGT' // Guatemala
  | 'MHN' // Honduras
  | 'MNI' // Nicaragua
  | 'MSV'; // El Salvador

// Currency codes
export type MercadoLibreCurrency = 'ARS' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU' | 'USD';

// Client configuration
export interface MercadoLibreClientConfig {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  siteId: MercadoLibreSiteId;
}

// OAuth configuration
export interface MercadoLibreOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// OAuth token response
export interface MercadoLibreTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

// User information
export interface MercadoLibreUser {
  id: number;
  nickname: string;
  registration_date: string;
  first_name: string;
  last_name: string;
  country_id: string;
  email: string;
  identification: {
    type: string;
    number: string;
  };
  address: {
    state: string;
    city: string;
  };
  phone: {
    number: string;
    extension: string | null;
    area_code: string;
    verified: boolean;
  };
  site_id: MercadoLibreSiteId;
  permalink: string;
  seller_experience: string;
  seller_reputation: MercadoLibreSellerReputation;
  status: {
    site_status: string;
    list: {
      allow: boolean;
      codes: string[];
      immediate_payment: {
        required: boolean;
        reasons: string[];
      };
    };
    buy: {
      allow: boolean;
      codes: string[];
      immediate_payment: {
        required: boolean;
        reasons: string[];
      };
    };
    sell: {
      allow: boolean;
      codes: string[];
      immediate_payment: {
        required: boolean;
        reasons: string[];
      };
    };
    billing: {
      allow: boolean;
      codes: string[];
    };
    mercadopago_tc_accepted: boolean;
    mercadopago_account_type: string;
    mercadoenvios: string;
    immediate_payment: boolean;
    confirmed_email: boolean;
    user_type: string;
    required_action: string;
  };
}

// Seller reputation
export interface MercadoLibreSellerReputation {
  level_id: string | null;
  power_seller_status: string | null;
  transactions: {
    period: string;
    total: number;
    completed: number;
    canceled: number;
    ratings: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  metrics: {
    sales: {
      period: string;
      completed: number;
    };
    claims: {
      period: string;
      rate: number;
      value: number;
    };
    delayed_handling_time: {
      period: string;
      rate: number;
      value: number;
    };
    cancellations: {
      period: string;
      rate: number;
      value: number;
    };
  };
}

// Item/Listing
export interface MercadoLibreItem {
  id: string;
  site_id: MercadoLibreSiteId;
  title: string;
  subtitle: string | null;
  seller_id: number;
  category_id: string;
  official_store_id: number | null;
  price: number;
  base_price: number;
  original_price: number | null;
  currency_id: MercadoLibreCurrency;
  initial_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  sale_terms: MercadoLibreSaleTerm[];
  buying_mode: 'buy_it_now' | 'auction';
  listing_type_id: string;
  start_time: string;
  stop_time: string;
  condition: 'new' | 'used' | 'not_specified';
  permalink: string;
  thumbnail_id: string;
  thumbnail: string;
  secure_thumbnail: string;
  pictures: MercadoLibrePicture[];
  video_id: string | null;
  descriptions: unknown[];
  accepts_mercadopago: boolean;
  non_mercado_pago_payment_methods: unknown[];
  shipping: MercadoLibreShipping;
  international_delivery_mode: string;
  seller_address: MercadoLibreAddress;
  seller_contact: unknown | null;
  location: MercadoLibreLocation | null;
  coverage_areas: unknown[];
  attributes: MercadoLibreAttribute[];
  listing_source: string;
  variations: MercadoLibreVariation[];
  status: 'active' | 'paused' | 'closed' | 'under_review' | 'inactive';
  sub_status: string[];
  warranty: string | null;
  catalog_product_id: string | null;
  domain_id: string;
  parent_item_id: string | null;
  differential_pricing: unknown | null;
  deal_ids: string[];
  automatic_relist: boolean;
  date_created: string;
  last_updated: string;
  health: number | null;
  catalog_listing: boolean;
  channels: string[];
}

// Sale term
export interface MercadoLibreSaleTerm {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string;
  value_struct: {
    number: number;
    unit: string;
  } | null;
  values: unknown[];
}

// Picture
export interface MercadoLibrePicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
  quality: string;
}

// Shipping
export interface MercadoLibreShipping {
  mode: string;
  methods: unknown[];
  tags: string[];
  dimensions: string | null;
  local_pick_up: boolean;
  free_shipping: boolean;
  logistic_type: string;
  store_pick_up: boolean;
}

// Address
export interface MercadoLibreAddress {
  city: {
    id: string;
    name: string;
  };
  state: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
  };
  search_location?: {
    neighborhood: {
      id: string;
      name: string;
    };
    city: {
      id: string;
      name: string;
    };
    state: {
      id: string;
      name: string;
    };
  };
  id: number;
}

// Location
export interface MercadoLibreLocation {
  address_line: string;
  zip_code: string;
  subneighborhood: unknown | null;
  neighborhood: {
    id: string;
    name: string;
  };
  city: {
    id: string;
    name: string;
  };
  state: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
  };
  latitude: number;
  longitude: number;
}

// Attribute
export interface MercadoLibreAttribute {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string | null;
  value_struct: unknown | null;
  values: unknown[];
  attribute_group_id: string;
  attribute_group_name: string;
}

// Variation
export interface MercadoLibreVariation {
  id: number;
  price: number;
  attribute_combinations: MercadoLibreAttributeCombination[];
  available_quantity: number;
  sold_quantity: number;
  sale_terms: unknown[];
  picture_ids: string[];
  catalog_product_id: string | null;
}

// Attribute combination
export interface MercadoLibreAttributeCombination {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string;
  value_struct: unknown | null;
  values: unknown[];
}

// Order
export interface MercadoLibreOrder {
  id: number;
  date_created: string;
  date_closed: string | null;
  last_updated: string;
  manufacturing_ending_date: string | null;
  comment: string | null;
  pack_id: number | null;
  pickup_id: number | null;
  order_request: {
    return: unknown | null;
    change: unknown | null;
  };
  fulfilled: boolean | null;
  mediations: unknown[];
  total_amount: number;
  paid_amount: number;
  coupon: {
    id: number | null;
    amount: number;
  };
  expiration_date: string;
  order_items: MercadoLibreOrderItem[];
  currency_id: MercadoLibreCurrency;
  payments: MercadoLibrePayment[];
  shipping: MercadoLibreOrderShipping;
  status: MercadoLibreOrderStatus;
  status_detail: string | null;
  tags: string[];
  feedback: {
    buyer: unknown | null;
    seller: unknown | null;
  };
  context: {
    channel: string;
    site: MercadoLibreSiteId;
    flows: string[];
  };
  buyer: MercadoLibreBuyer;
  seller: {
    id: number;
  };
  taxes: {
    amount: number | null;
    currency_id: MercadoLibreCurrency | null;
    id: number | null;
  };
}

// Order status
export type MercadoLibreOrderStatus = 
  | 'confirmed'
  | 'payment_required'
  | 'payment_in_process'
  | 'partially_paid'
  | 'paid'
  | 'cancelled';

// Order item
export interface MercadoLibreOrderItem {
  item: {
    id: string;
    title: string;
    category_id: string;
    variation_id: number | null;
    seller_custom_field: string | null;
    variation_attributes: MercadoLibreVariationAttribute[];
    warranty: string | null;
    condition: string;
    seller_sku: string | null;
    global_price: unknown | null;
    net_weight: unknown | null;
  };
  quantity: number;
  requested_quantity: {
    value: number;
    measure: string;
  };
  picked_quantity: unknown | null;
  unit_price: number;
  full_unit_price: number;
  currency_id: MercadoLibreCurrency;
  manufacturing_days: unknown | null;
  sale_fee: number;
  listing_type_id: string;
}

// Variation attribute
export interface MercadoLibreVariationAttribute {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string;
}

// Payment
export interface MercadoLibrePayment {
  id: number;
  order_id: number;
  payer_id: number;
  collector: {
    id: number;
  };
  card_id: number | null;
  site_id: MercadoLibreSiteId;
  reason: string;
  payment_method_id: string;
  currency_id: MercadoLibreCurrency;
  installments: number;
  issuer_id: string | null;
  atm_transfer_reference: {
    company_id: string | null;
    transaction_id: string | null;
  };
  coupon_id: number | null;
  activation_uri: string | null;
  operation_type: string;
  payment_type: string;
  available_actions: string[];
  status: string;
  status_code: string | null;
  status_detail: string;
  transaction_amount: number;
  transaction_amount_refunded: number;
  taxes_amount: number;
  shipping_cost: number;
  coupon_amount: number;
  overpaid_amount: number;
  total_paid_amount: number;
  installment_amount: number | null;
  deferred_period: unknown | null;
  date_approved: string | null;
  authorization_code: string | null;
  transaction_order_id: string | null;
  date_created: string;
  date_last_modified: string;
  marketplace_fee: number;
}

// Order shipping
export interface MercadoLibreOrderShipping {
  id: number;
}

// Buyer
export interface MercadoLibreBuyer {
  id: number;
  nickname: string;
  first_name: string;
  last_name: string;
}

// Shipment
export interface MercadoLibreShipment {
  id: number;
  mode: string;
  created_by: string;
  order_id: number;
  order_cost: number;
  base_cost: number;
  site_id: MercadoLibreSiteId;
  status: MercadoLibreShipmentStatus;
  substatus: string | null;
  status_history: MercadoLibreStatusHistory;
  date_created: string;
  last_updated: string;
  tracking_number: string | null;
  tracking_method: string | null;
  service_id: number;
  carrier_info: unknown | null;
  sender_id: number;
  sender_address: MercadoLibreShippingAddress;
  receiver_id: number;
  receiver_address: MercadoLibreShippingAddress;
  shipping_items: MercadoLibreShippingItem[];
  shipping_option: MercadoLibreShippingOption;
}

// Shipment status
export type MercadoLibreShipmentStatus = 
  | 'pending'
  | 'handling'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'not_delivered'
  | 'cancelled';

// Status history
export interface MercadoLibreStatusHistory {
  date_cancelled: string | null;
  date_delivered: string | null;
  date_first_visit: string | null;
  date_handling: string | null;
  date_not_delivered: string | null;
  date_ready_to_ship: string | null;
  date_returned: string | null;
  date_shipped: string | null;
}

// Shipping address
export interface MercadoLibreShippingAddress {
  id: number;
  address_line: string;
  street_name: string;
  street_number: string;
  comment: string | null;
  zip_code: string;
  city: {
    id: string | null;
    name: string;
  };
  state: {
    id: string;
    name: string;
  };
  country: {
    id: string;
    name: string;
  };
  neighborhood: {
    id: string | null;
    name: string | null;
  };
  municipality: {
    id: string | null;
    name: string | null;
  };
  latitude: number;
  longitude: number;
  receiver_name: string;
  receiver_phone: string;
}

// Shipping item
export interface MercadoLibreShippingItem {
  id: string;
  description: string;
  quantity: number;
  dimensions: string | null;
}

// Shipping option
export interface MercadoLibreShippingOption {
  id: number;
  shipping_method_id: number;
  name: string;
  currency_id: MercadoLibreCurrency;
  cost: number;
  estimated_delivery_time: {
    type: string;
    date: string;
  };
  estimated_handling_limit: {
    date: string;
  };
  estimated_schedule_limit: {
    date: string | null;
  };
}

// Question
export interface MercadoLibreQuestion {
  id: number;
  seller_id: number;
  status: 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED' | 'UNDER_REVIEW' | 'BANNED';
  text: string;
  item_id: string;
  date_created: string;
  from: {
    id: number;
    answered_questions: number;
  };
  answer: MercadoLibreAnswer | null;
  deleted_from_listing: boolean;
  hold: boolean;
}

// Answer
export interface MercadoLibreAnswer {
  text: string;
  status: string;
  date_created: string;
}

// Webhook notification
export interface MercadoLibreNotification {
  _id: string;
  resource: string;
  user_id: number;
  topic: MercadoLibreWebhookTopic;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

// Webhook topics
export type MercadoLibreWebhookTopic = 
  | 'orders_v2'
  | 'items'
  | 'questions'
  | 'messages'
  | 'payments'
  | 'shipments'
  | 'claims'
  | 'invoices';

// Sync options
export interface MercadoLibreSyncOptions {
  offset?: number;
  limit?: number;
  sinceDate?: string;
  sort?: 'date_asc' | 'date_desc';
}

// Search response
export interface MercadoLibreSearchResponse<T> {
  seller_id: string;
  query: string | null;
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  results: T[];
  orders?: T[]; // For orders search
}

// Orders search response
export interface MercadoLibreOrdersResponse {
  query: string | null;
  results: MercadoLibreOrder[];
  sort: {
    id: string;
    name: string;
  };
  available_sorts: unknown[];
  filters: unknown[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  display: string;
}
