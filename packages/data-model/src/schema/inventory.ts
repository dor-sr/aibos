import { pgTable, text, timestamp, integer, numeric, jsonb, index, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';
import { ecommerceProducts } from './ecommerce';

// Enums for inventory management
export const stockStatusEnum = pgEnum('stock_status', ['healthy', 'low', 'critical', 'out_of_stock', 'overstock']);
export const movementTypeEnum = pgEnum('movement_type', ['in', 'out', 'adjustment', 'transfer', 'return']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled']);
export const locationTypeEnum = pgEnum('location_type', ['warehouse', 'store', 'fulfillment_center', 'marketplace', 'dropship']);

// Inventory Locations
export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: locationTypeEnum('type').notNull().default('warehouse'),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    country: text('country'),
    postalCode: text('postal_code'),
    isActive: boolean('is_active').default(true),
    isDefault: boolean('is_default').default(false),
    platform: text('platform'), // shopify, tiendanube, etc.
    platformLocationId: text('platform_location_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('inventory_locations_workspace_idx').on(table.workspaceId),
    index('inventory_locations_platform_idx').on(table.workspaceId, table.platform),
  ]
);

// Inventory Levels - stock per product per location
export const inventoryLevels = pgTable(
  'inventory_levels',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    availableQuantity: integer('available_quantity').notNull().default(0),
    reorderPoint: integer('reorder_point'),
    reorderQuantity: integer('reorder_quantity'),
    safetyStock: integer('safety_stock').default(0),
    status: stockStatusEnum('status').notNull().default('healthy'),
    daysOfStock: numeric('days_of_stock', { precision: 10, scale: 2 }),
    averageDailySales: numeric('average_daily_sales', { precision: 10, scale: 4 }),
    lastStockUpdate: timestamp('last_stock_update', { withTimezone: true }),
    lastCountedAt: timestamp('last_counted_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('inventory_levels_workspace_idx').on(table.workspaceId),
    index('inventory_levels_product_idx').on(table.productId),
    index('inventory_levels_location_idx').on(table.locationId),
    index('inventory_levels_status_idx').on(table.workspaceId, table.status),
  ]
);

// Stock Movements - in/out tracking
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    type: movementTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    previousQuantity: integer('previous_quantity').notNull(),
    newQuantity: integer('new_quantity').notNull(),
    reason: text('reason'),
    referenceType: text('reference_type'), // order, purchase_order, adjustment, transfer
    referenceId: text('reference_id'),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: text('created_by'),
  },
  (table) => [
    index('stock_movements_workspace_idx').on(table.workspaceId),
    index('stock_movements_product_idx').on(table.productId),
    index('stock_movements_location_idx').on(table.locationId),
    index('stock_movements_date_idx').on(table.workspaceId, table.createdAt),
    index('stock_movements_reference_idx').on(table.referenceType, table.referenceId),
  ]
);

// Suppliers
export const suppliers = pgTable(
  'suppliers',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    email: text('email'),
    phone: text('phone'),
    contactName: text('contact_name'),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    currency: text('currency').default('USD'),
    leadTimeDays: integer('lead_time_days').default(7),
    minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }),
    paymentTerms: text('payment_terms'),
    isActive: boolean('is_active').default(true),
    rating: numeric('rating', { precision: 3, scale: 2 }), // 0-5 rating
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('suppliers_workspace_idx').on(table.workspaceId),
  ]
);

// Purchase Orders
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    supplierId: text('supplier_id')
      .references(() => suppliers.id, { onDelete: 'set null' }),
    destinationLocationId: text('destination_location_id')
      .references(() => inventoryLocations.id, { onDelete: 'set null' }),
    orderNumber: text('order_number'),
    status: purchaseOrderStatusEnum('status').notNull().default('draft'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }),
    shippingAmount: numeric('shipping_amount', { precision: 12, scale: 2 }),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
    currency: text('currency').default('USD'),
    expectedDeliveryDate: timestamp('expected_delivery_date', { withTimezone: true }),
    actualDeliveryDate: timestamp('actual_delivery_date', { withTimezone: true }),
    orderedAt: timestamp('ordered_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: text('created_by'),
  },
  (table) => [
    index('purchase_orders_workspace_idx').on(table.workspaceId),
    index('purchase_orders_supplier_idx').on(table.supplierId),
    index('purchase_orders_status_idx').on(table.workspaceId, table.status),
  ]
);

// Purchase Order Items
export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: text('id').primaryKey().notNull(),
    purchaseOrderId: text('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    receivedQuantity: integer('received_quantity').default(0),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    totalCost: numeric('total_cost', { precision: 12, scale: 2 }).notNull(),
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('purchase_order_items_po_idx').on(table.purchaseOrderId),
    index('purchase_order_items_product_idx').on(table.productId),
  ]
);

// Price History
export const priceHistory = pgTable(
  'price_history',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: 'cascade' }),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    cost: numeric('cost', { precision: 12, scale: 2 }),
    margin: numeric('margin', { precision: 10, scale: 4 }),
    marginPercent: numeric('margin_percent', { precision: 10, scale: 4 }),
    platform: text('platform'),
    currency: text('currency').default('USD'),
    changeReason: text('change_reason'),
    effectiveDate: timestamp('effective_date', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('price_history_workspace_idx').on(table.workspaceId),
    index('price_history_product_idx').on(table.productId),
    index('price_history_date_idx').on(table.productId, table.effectiveDate),
  ]
);

// Stock Alerts
export const stockAlerts = pgTable(
  'stock_alerts',
  {
    id: text('id').primaryKey().notNull(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // low_stock, out_of_stock, overstock, reorder_needed
    severity: text('severity').notNull().default('medium'), // low, medium, high, critical
    title: text('title').notNull(),
    message: text('message'),
    suggestedAction: text('suggested_action'),
    currentStock: integer('current_stock'),
    threshold: integer('threshold'),
    isResolved: boolean('is_resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stock_alerts_workspace_idx').on(table.workspaceId),
    index('stock_alerts_product_idx').on(table.productId),
    index('stock_alerts_unresolved_idx').on(table.workspaceId, table.isResolved),
  ]
);

// Infer types from schema
export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocation = typeof inventoryLocations.$inferInsert;
export type InventoryLevel = typeof inventoryLevels.$inferSelect;
export type NewInventoryLevel = typeof inventoryLevels.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;
export type StockAlert = typeof stockAlerts.$inferSelect;
export type NewStockAlert = typeof stockAlerts.$inferInsert;
