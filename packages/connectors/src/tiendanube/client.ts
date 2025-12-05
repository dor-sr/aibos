/**
 * Tiendanube API Client
 * Based on: https://tiendanube.github.io/api-documentation/
 */

import type {
  TiendanubeClientConfig,
  TiendanubeStore,
  TiendanubeCustomer,
  TiendanubeProduct,
  TiendanubeOrder,
  TiendanubeSyncOptions,
  TiendanubeWebhook,
  TiendanubeWebhookEvent,
} from './types';

const API_BASE_URL = 'https://api.tiendanube.com/v1';
const DEFAULT_USER_AGENT = 'AI Business OS/1.0';
const DEFAULT_PER_PAGE = 200;

export class TiendanubeClient {
  private config: TiendanubeClientConfig;
  private baseUrl: string;

  constructor(config: TiendanubeClientConfig) {
    this.config = config;
    this.baseUrl = `${API_BASE_URL}/${config.storeId}`;
  }

  /**
   * Make an authenticated request to the Tiendanube API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authentication': `bearer ${this.config.accessToken}`,
        'User-Agent': this.config.userAgent || DEFAULT_USER_AGENT,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tiendanube API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection by fetching store info
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getStore();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get store information
   */
  async getStore(): Promise<TiendanubeStore> {
    // Store endpoint is at the root level
    const response = await fetch(`${API_BASE_URL}/${this.config.storeId}`, {
      headers: {
        'Authentication': `bearer ${this.config.accessToken}`,
        'User-Agent': this.config.userAgent || DEFAULT_USER_AGENT,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get store info: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  /**
   * List customers with optional filters
   */
  async listCustomers(options: TiendanubeSyncOptions = {}): Promise<TiendanubeCustomer[]> {
    const params = new URLSearchParams();
    
    if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
    if (options.createdAtMax) params.set('created_at_max', options.createdAtMax);
    if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
    if (options.updatedAtMax) params.set('updated_at_max', options.updatedAtMax);
    if (options.page) params.set('page', String(options.page));
    params.set('per_page', String(options.perPage || DEFAULT_PER_PAGE));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<TiendanubeCustomer[]>(`/customers${query}`);
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(customerId: number): Promise<TiendanubeCustomer> {
    return this.request<TiendanubeCustomer>(`/customers/${customerId}`);
  }

  /**
   * Fetch all customers with pagination
   */
  async fetchAllCustomers(options: TiendanubeSyncOptions = {}): Promise<TiendanubeCustomer[]> {
    const allCustomers: TiendanubeCustomer[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const customers = await this.listCustomers({ ...options, page, perPage: DEFAULT_PER_PAGE });
      allCustomers.push(...customers);
      
      hasMore = customers.length === DEFAULT_PER_PAGE;
      page++;
    }

    return allCustomers;
  }

  // ============================================
  // PRODUCTS
  // ============================================

  /**
   * List products with optional filters
   */
  async listProducts(options: TiendanubeSyncOptions = {}): Promise<TiendanubeProduct[]> {
    const params = new URLSearchParams();
    
    if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
    if (options.createdAtMax) params.set('created_at_max', options.createdAtMax);
    if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
    if (options.updatedAtMax) params.set('updated_at_max', options.updatedAtMax);
    if (options.page) params.set('page', String(options.page));
    params.set('per_page', String(options.perPage || DEFAULT_PER_PAGE));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<TiendanubeProduct[]>(`/products${query}`);
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: number): Promise<TiendanubeProduct> {
    return this.request<TiendanubeProduct>(`/products/${productId}`);
  }

  /**
   * Fetch all products with pagination
   */
  async fetchAllProducts(options: TiendanubeSyncOptions = {}): Promise<TiendanubeProduct[]> {
    const allProducts: TiendanubeProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.listProducts({ ...options, page, perPage: DEFAULT_PER_PAGE });
      allProducts.push(...products);
      
      hasMore = products.length === DEFAULT_PER_PAGE;
      page++;
    }

    return allProducts;
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * List orders with optional filters
   */
  async listOrders(options: TiendanubeSyncOptions = {}): Promise<TiendanubeOrder[]> {
    const params = new URLSearchParams();
    
    if (options.createdAtMin) params.set('created_at_min', options.createdAtMin);
    if (options.createdAtMax) params.set('created_at_max', options.createdAtMax);
    if (options.updatedAtMin) params.set('updated_at_min', options.updatedAtMin);
    if (options.updatedAtMax) params.set('updated_at_max', options.updatedAtMax);
    if (options.page) params.set('page', String(options.page));
    params.set('per_page', String(options.perPage || DEFAULT_PER_PAGE));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<TiendanubeOrder[]>(`/orders${query}`);
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: number): Promise<TiendanubeOrder> {
    return this.request<TiendanubeOrder>(`/orders/${orderId}`);
  }

  /**
   * Fetch all orders with pagination
   */
  async fetchAllOrders(options: TiendanubeSyncOptions = {}): Promise<TiendanubeOrder[]> {
    const allOrders: TiendanubeOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const orders = await this.listOrders({ ...options, page, perPage: DEFAULT_PER_PAGE });
      allOrders.push(...orders);
      
      hasMore = orders.length === DEFAULT_PER_PAGE;
      page++;
    }

    return allOrders;
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<TiendanubeWebhook[]> {
    return this.request<TiendanubeWebhook[]>('/webhooks');
  }

  /**
   * Create a webhook
   */
  async createWebhook(url: string, event: TiendanubeWebhookEvent): Promise<TiendanubeWebhook> {
    return this.request<TiendanubeWebhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, event }),
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: number): Promise<void> {
    await this.request<void>(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Register all required webhooks
   */
  async registerWebhooks(baseUrl: string): Promise<TiendanubeWebhook[]> {
    const events: TiendanubeWebhookEvent[] = [
      'order/created',
      'order/updated',
      'order/paid',
      'order/fulfilled',
      'order/cancelled',
      'product/created',
      'product/updated',
      'product/deleted',
    ];

    const webhooks: TiendanubeWebhook[] = [];
    const webhookUrl = `${baseUrl}/api/webhooks/tiendanube`;

    // First, get existing webhooks
    const existingWebhooks = await this.listWebhooks();
    const existingEvents = new Set(existingWebhooks.map(w => w.event));

    // Register missing webhooks
    for (const event of events) {
      if (!existingEvents.has(event)) {
        const webhook = await this.createWebhook(webhookUrl, event);
        webhooks.push(webhook);
      }
    }

    return webhooks;
  }
}
