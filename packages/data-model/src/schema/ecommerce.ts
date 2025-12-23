import { pgTable, text, timestamp, integer, numeric, jsonb, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

// Customers (ecommerce)
export const ecommerceCustomers = pgTable(
  'ecommerce_customers',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(), // ID from source system
    source: text('source').notNull(), // shopify, tiendanube, etc.
    email: text('email'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    phone: text('phone'),
    totalOrders: integer('total_orders').default(0),
    totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).default('0'),
    currency: text('currency').default('USD'),
    tags: text('tags').array(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    firstOrderAt: timestamp('first_order_at', { withTimezone: true }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ecommerce_customers_workspace_idx').on(table.workspaceId),
    index('ecommerce_customers_email_idx').on(table.email),
    index('ecommerce_customers_external_idx').on(table.workspaceId, table.source, table.externalId),
  ]
);

// Products
export const ecommerceProducts = pgTable(
  'ecommerce_products',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    vendor: text('vendor'),
    productType: text('product_type'),
    status: text('status'), // active, draft, archived
    price: numeric('price', { precision: 12, scale: 2 }),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    currency: text('currency').default('USD'),
    sku: text('sku'),
    barcode: text('barcode'),
    inventoryQuantity: integer('inventory_quantity'),
    imageUrl: text('image_url'),
    tags: text('tags').array(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ecommerce_products_workspace_idx').on(table.workspaceId),
    index('ecommerce_products_external_idx').on(table.workspaceId, table.source, table.externalId),
  ]
);

// Orders
export const ecommerceOrders = pgTable(
  'ecommerce_orders',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    customerId: text('customer_id').references(() => ecommerceCustomers.id),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    orderNumber: text('order_number'),
    status: text('status'), // pending, paid, fulfilled, cancelled, refunded
    financialStatus: text('financial_status'), // pending, paid, refunded, partially_refunded
    fulfillmentStatus: text('fulfillment_status'), // unfulfilled, partial, fulfilled
    subtotalPrice: numeric('subtotal_price', { precision: 12, scale: 2 }),
    totalDiscount: numeric('total_discount', { precision: 12, scale: 2 }),
    totalTax: numeric('total_tax', { precision: 12, scale: 2 }),
    totalShipping: numeric('total_shipping', { precision: 12, scale: 2 }),
    totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    itemCount: integer('item_count').default(0),
    discountCodes: text('discount_codes').array(),
    tags: text('tags').array(),
    note: text('note'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ecommerce_orders_workspace_idx').on(table.workspaceId),
    index('ecommerce_orders_customer_idx').on(table.customerId),
    index('ecommerce_orders_external_idx').on(table.workspaceId, table.source, table.externalId),
    index('ecommerce_orders_date_idx').on(table.workspaceId, table.sourceCreatedAt),
  ]
);

// Order line items
export const ecommerceOrderItems = pgTable(
  'ecommerce_order_items',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    orderId: text('order_id')
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => ecommerceProducts.id),
    externalId: text('external_id'),
    externalProductId: text('external_product_id'),
    title: text('title').notNull(),
    variantTitle: text('variant_title'),
    sku: text('sku'),
    quantity: integer('quantity').notNull().default(1),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    totalDiscount: numeric('total_discount', { precision: 12, scale: 2 }).default('0'),
    totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ecommerce_order_items_order_idx').on(table.orderId),
    index('ecommerce_order_items_product_idx').on(table.productId),
  ]
);

// Infer types from schema
export type EcommerceCustomer = typeof ecommerceCustomers.$inferSelect;
export type NewEcommerceCustomer = typeof ecommerceCustomers.$inferInsert;
export type EcommerceProduct = typeof ecommerceProducts.$inferSelect;
export type NewEcommerceProduct = typeof ecommerceProducts.$inferInsert;
export type EcommerceOrder = typeof ecommerceOrders.$inferSelect;
export type NewEcommerceOrder = typeof ecommerceOrders.$inferInsert;
export type EcommerceOrderItem = typeof ecommerceOrderItems.$inferSelect;
export type NewEcommerceOrderItem = typeof ecommerceOrderItems.$inferInsert;









