import type { CurrencyCode } from '../types/common';

/**
 * Currency configuration
 */
interface CurrencyConfig {
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
}

/**
 * Currency configurations
 */
const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, symbolPosition: 'before' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, symbolPosition: 'before' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, symbolPosition: 'before' },
  MXN: { symbol: '$', name: 'Mexican Peso', decimals: 2, symbolPosition: 'before' },
  ARS: { symbol: '$', name: 'Argentine Peso', decimals: 2, symbolPosition: 'before' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', decimals: 2, symbolPosition: 'before' },
  CLP: { symbol: '$', name: 'Chilean Peso', decimals: 0, symbolPosition: 'before' },
  COP: { symbol: '$', name: 'Colombian Peso', decimals: 0, symbolPosition: 'before' },
};

/**
 * Format a monetary value
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'USD',
  options?: { compact?: boolean; showCode?: boolean }
): string {
  const config = CURRENCIES[currency];
  const { compact = false, showCode = false } = options ?? {};

  let value: string;

  if (compact && Math.abs(amount) >= 1000) {
    if (Math.abs(amount) >= 1000000) {
      value = `${(amount / 1000000).toFixed(1)}M`;
    } else {
      value = `${(amount / 1000).toFixed(1)}K`;
    }
  } else {
    value = amount.toLocaleString('en-US', {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  }

  const formatted =
    config.symbolPosition === 'before' ? `${config.symbol}${value}` : `${value}${config.symbol}`;

  return showCode ? `${formatted} ${currency}` : formatted;
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and separators
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Get currency config
 */
export function getCurrencyConfig(currency: CurrencyCode): CurrencyConfig {
  return CURRENCIES[currency];
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a large number compactly
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-US');
}



