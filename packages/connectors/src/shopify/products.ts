import { createLogger, generateId } from '@aibos/core';
import { db, ecommerceProducts, type NewEcommerceProduct } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { ShopifyClient, ShopifyProduct, ListProductsParams } from './client';

const logger = createLogger('shopify:products');

/**
 * Sync Shopify products to normalized schema
 */
export async function syncProducts(
  client: ShopifyClient,
  workspaceId: string,
  params: ListProductsParams = {}
): Promise<number> {
  logger.info('Syncing Shopify products', { workspaceId, params });

  let totalProcessed = 0;
  let hasMore = true;
  let sinceId: string | undefined;

  while (hasMore) {
    const response = await client.listProducts({
      ...params,
      limit: 250,
      sinceId,
    });

    const products = response.products;

    if (products.length === 0) {
      hasMore = false;
      break;
    }

    // Process products in batch
    for (const product of products) {
      await processProduct(product, workspaceId);
      totalProcessed++;
    }

    // Get the last product ID for pagination
    sinceId = products[products.length - 1]?.id.toString();

    // If we got less than the limit, we're done
    if (products.length < 250) {
      hasMore = false;
    }
  }

  logger.info('Shopify products sync completed', {
    workspaceId,
    totalProcessed,
  });

  return totalProcessed;
}

/**
 * Process a single Shopify product into normalized schema
 */
async function processProduct(product: ShopifyProduct, workspaceId: string): Promise<void> {
  const externalId = product.id.toString();

  // Check if product already exists
  const existing = await db
    .select({ id: ecommerceProducts.id })
    .from(ecommerceProducts)
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.source, 'shopify'),
        eq(ecommerceProducts.externalId, externalId)
      )
    )
    .limit(1);

  // Get the primary variant for pricing
  const primaryVariant = product.variants[0];
  const primaryImage = product.images[0];

  // Transform Shopify product to normalized format
  const normalizedProduct: NewEcommerceProduct = {
    id: existing[0]?.id ?? generateId(),
    workspaceId,
    externalId,
    source: 'shopify',
    title: product.title,
    description: stripHtml(product.body_html),
    vendor: product.vendor,
    productType: product.product_type,
    status: product.status,
    price: primaryVariant ? primaryVariant.price : null,
    compareAtPrice: primaryVariant?.compare_at_price ?? null,
    currency: 'USD', // Shopify doesn't include currency on products
    sku: primaryVariant?.sku ?? null,
    barcode: primaryVariant?.barcode ?? null,
    inventoryQuantity: product.variants.reduce(
      (sum, v) => sum + (v.inventory_quantity || 0),
      0
    ),
    imageUrl: primaryImage?.src ?? null,
    tags: product.tags ? product.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    sourceCreatedAt: new Date(product.created_at),
    updatedAt: new Date(),
  };

  // Upsert product
  const existingRecord = existing[0];
  if (existingRecord) {
    await db
      .update(ecommerceProducts)
      .set(normalizedProduct)
      .where(eq(ecommerceProducts.id, existingRecord.id));
  } else {
    await db.insert(ecommerceProducts).values(normalizedProduct);
  }

  logger.debug('Processed product', {
    productId: externalId,
    title: product.title,
    isUpdate: existing.length > 0,
  });
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim();
}


