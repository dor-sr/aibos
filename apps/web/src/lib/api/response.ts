// API Response helpers for consistent JSON responses
import { NextResponse } from 'next/server';

// API version
export const API_VERSION = 'v1';

// Standard success response
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// Standard error response
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Error codes
export const API_ERROR_CODES = {
  // Authentication errors (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_INACTIVE: 'API_KEY_INACTIVE',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  CONNECTOR_NOT_FOUND: 'CONNECTOR_NOT_FOUND',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_CODES;

/**
 * Create a success response
 */
export function createApiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse['meta'],
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION,
      ...headers,
    },
  });
}

/**
 * Create an error response
 */
export function createApiError(
  message: string,
  code: ApiErrorCode = 'INTERNAL_ERROR',
  status: number = 500,
  headers?: Record<string, string>,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return NextResponse.json(response, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION,
      ...headers,
    },
  });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T[]>> {
  return createApiSuccess(
    data,
    {
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
    headers
  );
}

/**
 * Parse pagination parameters from request
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page: number; pageSize: number; maxPageSize: number } = {
    page: 1,
    pageSize: 20,
    maxPageSize: 100,
  }
): { page: number; pageSize: number; offset: number } {
  let page = parseInt(searchParams.get('page') || String(defaults.page), 10);
  let pageSize = parseInt(searchParams.get('page_size') || searchParams.get('limit') || String(defaults.pageSize), 10);
  
  // Validate
  if (isNaN(page) || page < 1) page = defaults.page;
  if (isNaN(pageSize) || pageSize < 1) pageSize = defaults.pageSize;
  if (pageSize > defaults.maxPageSize) pageSize = defaults.maxPageSize;
  
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

/**
 * Parse date range parameters
 */
export function parseDateRange(
  searchParams: URLSearchParams,
  defaultDays: number = 30
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  let startDate: Date;
  let endDate: Date;
  
  const startParam = searchParams.get('start_date') || searchParams.get('from');
  const endParam = searchParams.get('end_date') || searchParams.get('to');
  const periodParam = searchParams.get('period');
  
  if (startParam) {
    startDate = new Date(startParam);
    if (isNaN(startDate.getTime())) {
      startDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    }
  } else if (periodParam) {
    // Parse period like '7d', '30d', '3m', '1y'
    const match = periodParam.match(/^(\d+)([dDwWmMyY])$/);
    if (match && match[1] && match[2]) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      switch (unit) {
        case 'd':
          startDate = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
          break;
        case 'w':
          startDate = new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'm':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - value);
          break;
        case 'y':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - value);
          break;
        default:
          startDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
      }
    } else {
      startDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    }
  } else {
    startDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  }
  
  if (endParam) {
    endDate = new Date(endParam);
    if (isNaN(endDate.getTime())) {
      endDate = now;
    }
  } else {
    endDate = now;
  }
  
  // Ensure start is before end
  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }
  
  return { startDate, endDate };
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; error: NextResponse<ApiErrorResponse> } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(String(field));
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: createApiError(
        `Missing required field(s): ${missing.join(', ')}`,
        'MISSING_PARAMETER',
        400,
        undefined,
        { missingFields: missing }
      ),
    };
  }
  
  return { valid: true };
}

