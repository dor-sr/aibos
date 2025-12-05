/**
 * Zod schemas for connector data validation
 */

import { z } from 'zod';

// Customer schema
export const customerSchema = z.object({
  externalId: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Line item schema
export const lineItemSchema = z.object({
  externalId: z.string(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number(),
  totalDiscount: z.number().default(0),
});

// Order schema
export const orderSchema = z.object({
  externalId: z.string(),
  customerId: z.string().optional(),
  status: z.string(),
  financialStatus: z.string(),
  fulfillmentStatus: z.string().optional(),
  currency: z.string().length(3),
  totalPrice: z.number(),
  subtotalPrice: z.number(),
  totalTax: z.number(),
  totalDiscount: z.number(),
  lineItems: z.array(lineItemSchema),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Variant schema
export const variantSchema = z.object({
  externalId: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  inventoryQuantity: z.number().int().optional(),
  weight: z.number().optional(),
  weightUnit: z.string().optional(),
});

// Product schema
export const productSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['active', 'draft', 'archived']),
  vendor: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Subscription schema
export const subscriptionSchema = z.object({
  externalId: z.string(),
  customerId: z.string(),
  planId: z.string().optional(),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'paused']),
  currency: z.string().length(3),
  amount: z.number(),
  interval: z.enum(['day', 'week', 'month', 'year']),
  intervalCount: z.number().int().positive(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  canceledAt: z.date().optional(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Invoice schema
export const invoiceSchema = z.object({
  externalId: z.string(),
  customerId: z.string(),
  subscriptionId: z.string().optional(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  currency: z.string().length(3),
  amountDue: z.number(),
  amountPaid: z.number(),
  dueDate: z.date().optional(),
  paidAt: z.date().optional(),
  createdAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

// Webhook event schema
export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.date(),
  data: z.record(z.unknown()),
  raw: z.unknown().optional(),
});

// Sync result schema
export const syncResultSchema = z.object({
  success: z.boolean(),
  entityType: z.string(),
  recordsProcessed: z.number().int().nonnegative(),
  recordsCreated: z.number().int().nonnegative(),
  recordsUpdated: z.number().int().nonnegative(),
  recordsDeleted: z.number().int().nonnegative(),
  errors: z.array(z.object({
    recordId: z.string().optional(),
    message: z.string(),
    code: z.string().optional(),
    retryable: z.boolean(),
  })),
  durationMs: z.number().nonnegative(),
  cursor: z.string().optional(),
});

// Connection status schema
export const connectionStatusSchema = z.object({
  connected: z.boolean(),
  lastCheckedAt: z.date(),
  lastSyncAt: z.date().optional(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// Type exports from schemas
export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerOutput = z.output<typeof customerSchema>;

export type OrderInput = z.input<typeof orderSchema>;
export type OrderOutput = z.output<typeof orderSchema>;

export type ProductInput = z.input<typeof productSchema>;
export type ProductOutput = z.output<typeof productSchema>;

export type SubscriptionInput = z.input<typeof subscriptionSchema>;
export type SubscriptionOutput = z.output<typeof subscriptionSchema>;

export type InvoiceInput = z.input<typeof invoiceSchema>;
export type InvoiceOutput = z.output<typeof invoiceSchema>;

/**
 * Validate and parse customer data
 */
export function parseCustomer(data: unknown): CustomerOutput {
  return customerSchema.parse(data);
}

/**
 * Validate and parse order data
 */
export function parseOrder(data: unknown): OrderOutput {
  return orderSchema.parse(data);
}

/**
 * Validate and parse product data
 */
export function parseProduct(data: unknown): ProductOutput {
  return productSchema.parse(data);
}

/**
 * Validate and parse subscription data
 */
export function parseSubscription(data: unknown): SubscriptionOutput {
  return subscriptionSchema.parse(data);
}

/**
 * Validate and parse invoice data
 */
export function parseInvoice(data: unknown): InvoiceOutput {
  return invoiceSchema.parse(data);
}

/**
 * Safe parse with error handling
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
  };
}
