/**
 * Google Analytics 4 API Client
 */

import { createLogger } from '@aibos/core';
import type {
  GA4ClientConfig,
  GA4RunReportRequest,
  GA4RunReportResponse,
  GA4OAuthConfig,
  GA4TokenResponse,
  GA4Dimension,
  GA4Metric,
  GA4DateRange,
} from './types';

const logger = createLogger('ga4:client');

const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const GOOGLE_OAUTH_BASE = 'https://oauth2.googleapis.com';
const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

export class GA4Client {
  private config: GA4ClientConfig;
  private tokenExpiresAt?: Date;

  constructor(config: GA4ClientConfig) {
    this.config = config;
  }

  /**
   * Get the OAuth authorization URL
   */
  static getAuthorizationUrl(config: GA4OAuthConfig, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    config: GA4OAuthConfig,
    code: string
  ): Promise<GA4TokenResponse> {
    const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to exchange code for tokens', new Error(errorText));
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    config: GA4OAuthConfig,
    refreshToken: string
  ): Promise<GA4TokenResponse> {
    const response = await fetch(`${GOOGLE_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to refresh access token', new Error(errorText));
      throw new Error(`Failed to refresh access token: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Test connection to GA4
   */
  async testConnection(): Promise<boolean> {
    try {
      // Run a simple report to test connection
      const report = await this.runReport({
        property: `properties/${this.config.propertyId}`,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        limit: 1,
      });

      return !!report.dimensionHeaders;
    } catch (error) {
      logger.error('GA4 connection test failed', error as Error);
      return false;
    }
  }

  /**
   * Run a report against GA4 Data API
   */
  async runReport(request: GA4RunReportRequest): Promise<GA4RunReportResponse> {
    const { property, ...body } = request;
    const url = `${GA4_DATA_API_BASE}/${property}:runReport`;

    logger.debug('Running GA4 report', { property, dimensions: body.dimensions, metrics: body.metrics });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('GA4 report failed', new Error(`${response.status} - ${errorText}`));
      throw new Error(`GA4 report failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get sessions data
   */
  async getSessions(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
        { name: 'browser' },
        { name: 'operatingSystem' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'screenPageViews' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
    });
  }

  /**
   * Get pageview data
   */
  async getPageviews(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    });
  }

  /**
   * Get event tracking data
   */
  async getEvents(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'eventName' },
        { name: 'country' },
        { name: 'deviceCategory' },
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'eventCountPerUser' },
        { name: 'totalRevenue' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    });
  }

  /**
   * Get traffic source data
   */
  async getTrafficSources(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'sessionCampaignName' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'newUsers' },
        { name: 'totalUsers' },
        { name: 'engagedSessions' },
        { name: 'bounceRate' },
        { name: 'conversions' },
        { name: 'totalRevenue' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });
  }

  /**
   * Get conversion data
   */
  async getConversions(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'eventName' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
        { name: 'landingPage' },
        { name: 'country' },
        { name: 'deviceCategory' },
      ],
      metrics: [
        { name: 'conversions' },
        { name: 'totalRevenue' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: ['purchase', 'sign_up', 'generate_lead', 'add_to_cart', 'begin_checkout'],
          },
        },
      },
      orderBys: [{ metric: { metricName: 'conversions' }, desc: true }],
    });
  }

  /**
   * Get user acquisition data
   */
  async getUserAcquisition(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'firstUserSource' },
        { name: 'firstUserMedium' },
        { name: 'firstUserCampaignName' },
      ],
      metrics: [
        { name: 'newUsers' },
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'totalRevenue' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      orderBys: [{ metric: { metricName: 'newUsers' }, desc: true }],
    });
  }

  /**
   * Get channel performance data
   */
  async getChannelPerformance(
    startDate: string,
    endDate: string,
    limit = 10000
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions: [
        { name: 'date' },
        { name: 'sessionDefaultChannelGroup' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'newUsers' },
        { name: 'totalUsers' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
        { name: 'conversions' },
        { name: 'totalRevenue' },
      ],
      dateRanges: [{ startDate, endDate }],
      limit,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });
  }

  /**
   * Get custom report
   */
  async getCustomReport(
    dimensions: GA4Dimension[],
    metrics: GA4Metric[],
    dateRanges: GA4DateRange[],
    options: {
      limit?: number;
      offset?: number;
      dimensionFilter?: GA4RunReportRequest['dimensionFilter'];
      orderBys?: GA4RunReportRequest['orderBys'];
    } = {}
  ): Promise<GA4RunReportResponse> {
    return this.runReport({
      property: `properties/${this.config.propertyId}`,
      dimensions,
      metrics,
      dateRanges,
      limit: options.limit ?? 10000,
      offset: options.offset,
      dimensionFilter: options.dimensionFilter,
      orderBys: options.orderBys,
    });
  }

  /**
   * Update access token (after refresh)
   */
  updateAccessToken(accessToken: string, expiresAt?: Date): void {
    this.config.accessToken = accessToken;
    this.tokenExpiresAt = expiresAt;
  }

  /**
   * Get property ID
   */
  getPropertyId(): string {
    return this.config.propertyId;
  }
}

export type { GA4ClientConfig };



