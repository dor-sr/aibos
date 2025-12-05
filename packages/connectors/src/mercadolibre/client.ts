/**
 * MercadoLibre API Client
 * Based on: https://developers.mercadolibre.com/
 */

import type {
  MercadoLibreClientConfig,
  MercadoLibreUser,
  MercadoLibreItem,
  MercadoLibreOrder,
  MercadoLibreOrdersResponse,
  MercadoLibreShipment,
  MercadoLibreQuestion,
  MercadoLibreSyncOptions,
  MercadoLibreOAuthConfig,
  MercadoLibreTokenResponse,
} from './types';

const API_BASE_URL = 'https://api.mercadolibre.com';
const DEFAULT_LIMIT = 50;

export class MercadoLibreClient {
  private config: MercadoLibreClientConfig;

  constructor(config: MercadoLibreClientConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated request to the MercadoLibre API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MercadoLibre API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection by fetching user info
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user information
   */
  async getUser(): Promise<MercadoLibreUser> {
    return this.request<MercadoLibreUser>(`/users/${this.config.userId}`);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<MercadoLibreUser> {
    return this.request<MercadoLibreUser>('/users/me');
  }

  // ============================================
  // ITEMS (LISTINGS)
  // ============================================

  /**
   * List seller's items
   */
  async listItems(options: MercadoLibreSyncOptions = {}): Promise<string[]> {
    const params = new URLSearchParams();
    params.set('offset', String(options.offset || 0));
    params.set('limit', String(options.limit || DEFAULT_LIMIT));

    const response = await this.request<{ results: string[] }>(
      `/users/${this.config.userId}/items/search?${params.toString()}`
    );

    return response.results;
  }

  /**
   * Get item details by ID
   */
  async getItem(itemId: string): Promise<MercadoLibreItem> {
    return this.request<MercadoLibreItem>(`/items/${itemId}`);
  }

  /**
   * Get multiple items at once
   */
  async getItems(itemIds: string[]): Promise<MercadoLibreItem[]> {
    if (itemIds.length === 0) return [];
    
    // MercadoLibre allows fetching up to 20 items at once
    const chunks: string[][] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      chunks.push(itemIds.slice(i, i + 20));
    }

    const items: MercadoLibreItem[] = [];
    for (const chunk of chunks) {
      const response = await this.request<{ code: number; body: MercadoLibreItem }[]>(
        `/items?ids=${chunk.join(',')}`
      );
      items.push(...response.filter(r => r.code === 200).map(r => r.body));
    }

    return items;
  }

  /**
   * Fetch all items with pagination
   */
  async fetchAllItems(): Promise<MercadoLibreItem[]> {
    const allItemIds: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const itemIds = await this.listItems({ offset, limit: DEFAULT_LIMIT });
      allItemIds.push(...itemIds);
      
      hasMore = itemIds.length === DEFAULT_LIMIT;
      offset += DEFAULT_LIMIT;
    }

    return this.getItems(allItemIds);
  }

  // ============================================
  // ORDERS
  // ============================================

  /**
   * List seller's orders
   */
  async listOrders(options: MercadoLibreSyncOptions = {}): Promise<MercadoLibreOrdersResponse> {
    const params = new URLSearchParams();
    params.set('seller', this.config.userId);
    params.set('offset', String(options.offset || 0));
    params.set('limit', String(options.limit || DEFAULT_LIMIT));
    
    if (options.sort) {
      params.set('sort', options.sort);
    }
    
    if (options.sinceDate) {
      params.set('order.date_created.from', options.sinceDate);
    }

    return this.request<MercadoLibreOrdersResponse>(`/orders/search?${params.toString()}`);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<MercadoLibreOrder> {
    return this.request<MercadoLibreOrder>(`/orders/${orderId}`);
  }

  /**
   * Fetch all orders with pagination
   */
  async fetchAllOrders(options: MercadoLibreSyncOptions = {}): Promise<MercadoLibreOrder[]> {
    const allOrders: MercadoLibreOrder[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listOrders({ ...options, offset, limit: DEFAULT_LIMIT });
      allOrders.push(...response.results);
      
      hasMore = offset + response.results.length < response.paging.total;
      offset += DEFAULT_LIMIT;
    }

    return allOrders;
  }

  // ============================================
  // SHIPMENTS
  // ============================================

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: number): Promise<MercadoLibreShipment> {
    return this.request<MercadoLibreShipment>(`/shipments/${shipmentId}`);
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrder(orderId: number): Promise<MercadoLibreShipment | null> {
    try {
      const order = await this.getOrder(orderId);
      if (order.shipping?.id) {
        return this.getShipment(order.shipping.id);
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================
  // QUESTIONS
  // ============================================

  /**
   * List questions received by seller
   */
  async listQuestions(options: MercadoLibreSyncOptions & { status?: string } = {}): Promise<MercadoLibreQuestion[]> {
    const params = new URLSearchParams();
    params.set('seller_id', this.config.userId);
    params.set('offset', String(options.offset || 0));
    params.set('limit', String(options.limit || DEFAULT_LIMIT));
    
    if (options.status) {
      params.set('status', options.status);
    }

    const response = await this.request<{ questions: MercadoLibreQuestion[] }>(
      `/questions/search?${params.toString()}`
    );

    return response.questions;
  }

  /**
   * Get question by ID
   */
  async getQuestion(questionId: number): Promise<MercadoLibreQuestion> {
    return this.request<MercadoLibreQuestion>(`/questions/${questionId}`);
  }

  /**
   * Answer a question
   */
  async answerQuestion(questionId: number, text: string): Promise<void> {
    await this.request(`/answers`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        text,
      }),
    });
  }

  /**
   * Fetch all unanswered questions
   */
  async fetchUnansweredQuestions(): Promise<MercadoLibreQuestion[]> {
    const allQuestions: MercadoLibreQuestion[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const questions = await this.listQuestions({ offset, limit: DEFAULT_LIMIT, status: 'UNANSWERED' });
      allQuestions.push(...questions);
      
      hasMore = questions.length === DEFAULT_LIMIT;
      offset += DEFAULT_LIMIT;
    }

    return allQuestions;
  }

  // ============================================
  // FEES AND BILLING
  // ============================================

  /**
   * Get order billing info (fees)
   */
  async getOrderBilling(orderId: number): Promise<{ sale_fee: number; marketplace_fee: number }> {
    const order = await this.getOrder(orderId);
    
    let totalSaleFee = 0;
    let totalMarketplaceFee = 0;

    for (const item of order.order_items) {
      totalSaleFee += item.sale_fee;
    }

    for (const payment of order.payments) {
      totalMarketplaceFee += payment.marketplace_fee;
    }

    return {
      sale_fee: totalSaleFee,
      marketplace_fee: totalMarketplaceFee,
    };
  }

  // ============================================
  // STATIC OAUTH METHODS
  // ============================================

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(config: MercadoLibreOAuthConfig, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state,
    });

    return `https://auth.mercadolibre.com/authorization?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for tokens
   */
  static async exchangeCodeForTokens(
    config: MercadoLibreOAuthConfig,
    code: string
  ): Promise<MercadoLibreTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    config: MercadoLibreOAuthConfig,
    refreshToken: string
  ): Promise<MercadoLibreTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }
}
