import { formatCurrency, formatPercent, formatCompactNumber } from '@aibos/core';
import type { VerticalType, CurrencyCode } from '@aibos/core';

/**
 * Format an NLQ response
 */
export function formatResponse(
  rawResponse: string,
  data: Record<string, unknown>,
  verticalType: VerticalType
): string {
  // If the LLM already provided a good response, use it
  if (rawResponse && rawResponse.length > 50) {
    return rawResponse;
  }

  // Generate a formatted response from data
  if (Object.keys(data).length === 0) {
    return "I don't have enough data to answer that question right now. Make sure your data sources are connected and synced.";
  }

  return formatDataResponse(data, verticalType);
}

/**
 * Format a response based on data
 */
function formatDataResponse(
  data: Record<string, unknown>,
  verticalType: VerticalType
): string {
  const parts: string[] = [];

  // Format metric values
  if (data.revenue !== undefined) {
    const currency = (data.currency as CurrencyCode) || 'USD';
    parts.push(`Revenue: ${formatCurrency(data.revenue as number, currency)}`);
  }

  if (data.orders !== undefined) {
    parts.push(`Orders: ${formatCompactNumber(data.orders as number)}`);
  }

  if (data.aov !== undefined) {
    const currency = (data.currency as CurrencyCode) || 'USD';
    parts.push(`Average Order Value: ${formatCurrency(data.aov as number, currency)}`);
  }

  if (data.mrr !== undefined) {
    const currency = (data.currency as CurrencyCode) || 'USD';
    parts.push(`MRR: ${formatCurrency(data.mrr as number, currency)}`);
  }

  if (data.customers !== undefined) {
    parts.push(`Customers: ${formatCompactNumber(data.customers as number)}`);
  }

  // Format changes
  if (data.change !== undefined) {
    const change = data.change as number;
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
    parts.push(`Change: ${direction} ${formatPercent(Math.abs(change))}`);
  }

  // Format time period
  if (data.period) {
    parts.push(`Period: ${data.period}`);
  }

  if (parts.length === 0) {
    return "Here's what I found in your data.";
  }

  return `Here's what I found:\n\n${parts.join('\n')}`;
}

/**
 * Format a metric value for display
 */
export function formatMetricValue(
  metric: string,
  value: number,
  currency: CurrencyCode = 'USD'
): string {
  const currencyMetrics = ['revenue', 'aov', 'mrr', 'arr', 'ltv', 'cac'];
  const percentMetrics = ['churn', 'conversion', 'retention'];
  const countMetrics = ['orders', 'customers', 'users', 'subscriptions'];

  if (currencyMetrics.includes(metric.toLowerCase())) {
    return formatCurrency(value, currency);
  }

  if (percentMetrics.includes(metric.toLowerCase())) {
    return formatPercent(value);
  }

  if (countMetrics.includes(metric.toLowerCase())) {
    return formatCompactNumber(value);
  }

  return value.toLocaleString();
}

/**
 * Generate a comparison statement
 */
export function formatComparison(
  current: number,
  previous: number,
  metric: string
): string {
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained the same';
  const absChange = Math.abs(change).toFixed(1);

  if (change === 0) {
    return `${metric} remained the same at ${formatCompactNumber(current)}`;
  }

  return `${metric} ${direction} by ${absChange}% from ${formatCompactNumber(previous)} to ${formatCompactNumber(current)}`;
}




