import { createLogger } from '@aibos/core';

const logger = createLogger('shopify:client');

export interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

/**
 * Shopify API client
 * Wraps the Shopify Admin API for data fetching
 */
export class ShopifyClient {
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(config: ShopifyClientConfig) {
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion ?? '2024-01';
  }

  /**
   * Get the base URL for API requests
   */
  private get baseUrl(): string {
    return `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  /**
   * Make an authenticated request to Shopify
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    logger.debug('Making Shopify request', { endpoint });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Shopify request failed', new Error(error), {
        endpoint,
        status: response.status,
      });
      throw new Error(`Shopify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test the connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/shop.json');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get shop information
   */
  async getShop(): Promise<ShopifyShop> {
    const response = await this.request<{ shop: ShopifyShop }>('/shop.json');
    return response.shop;
  }

  /**
   * List orders with pagination
   */
  async listOrders(params: ListOrdersParams = {}): Promise<ShopifyOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sinceId) queryParams.set('since_id', params.sinceId);
    if (params.createdAtMin) queryParams.set('created_at_min', params.createdAtMin);
    if (params.createdAtMax) queryParams.set('created_at_max', params.createdAtMax);
    if (params.status) queryParams.set('status', params.status);
    if (params.financialStatus) queryParams.set('financial_status', params.financialStatus);

    const endpoint = `/orders.json?${queryParams.toString()}`;
    return this.request<ShopifyOrdersResponse>(endpoint);
  }

  /**
   * List products with pagination
   */
  async listProducts(params: ListProductsParams = {}): Promise<ShopifyProductsResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sinceId) queryParams.set('since_id', params.sinceId);
    if (params.createdAtMin) queryParams.set('created_at_min', params.createdAtMin);

    const endpoint = `/products.json?${queryParams.toString()}`;
    return this.request<ShopifyProductsResponse>(endpoint);
  }

  /**
   * List customers with pagination
   */
  async listCustomers(params: ListCustomersParams = {}): Promise<ShopifyCustomersResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.sinceId) queryParams.set('since_id', params.sinceId);
    if (params.createdAtMin) queryParams.set('created_at_min', params.createdAtMin);

    const endpoint = `/customers.json?${queryParams.toString()}`;
    return this.request<ShopifyCustomersResponse>(endpoint);
  }
}

// Shopify types
export interface ShopifyShop {
  id: number;
  name: string;
  email: string;
  domain: string;
  currency: string;
  timezone: string;
  plan_name: string;
}

export interface ListOrdersParams {
  limit?: number;
  sinceId?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  status?: 'open' | 'closed' | 'cancelled' | 'any';
  financialStatus?: string;
}

export interface ListProductsParams {
  limit?: number;
  sinceId?: string;
  createdAtMin?: string;
}

export interface ListCustomersParams {
  limit?: number;
  sinceId?: string;
  createdAtMin?: string;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  discount_codes: { code: string; amount: string }[];
  note: string | null;
  tags: string;
}

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
  total_discount: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  variants: ShopifyVariant[];
  images: { id: number; src: string }[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string | null;
  barcode: string | null;
  inventory_quantity: number;
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: string;
  currency: string;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
}





