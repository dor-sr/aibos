import { createLogger, generateId } from '@aibos/core';
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
  // Get the primary variant for pricing
  const primaryVariant = product.variants[0];
  const primaryImage = product.images[0];

  // Transform Shopify product to normalized format
  const normalizedProduct = {
    id: generateId(),
    workspaceId,
    externalId: product.id.toString(),
    source: 'shopify',
    title: product.title,
    description: stripHtml(product.body_html),
    vendor: product.vendor,
    productType: product.product_type,
    status: product.status,
    price: primaryVariant ? parseFloat(primaryVariant.price) : null,
    compareAtPrice: primaryVariant?.compare_at_price
      ? parseFloat(primaryVariant.compare_at_price)
      : null,
    currency: 'USD', // Shopify doesn't include currency on products
    sku: primaryVariant?.sku,
    barcode: primaryVariant?.barcode,
    inventoryQuantity: product.variants.reduce(
      (sum, v) => sum + (v.inventory_quantity || 0),
      0
    ),
    imageUrl: primaryImage?.src,
    tags: product.tags ? product.tags.split(',').map((t) => t.trim()) : [],
    sourceCreatedAt: new Date(product.created_at),
  };

  // TODO: Write to database using @aibos/data-model
  logger.debug('Processed product', {
    productId: normalizedProduct.externalId,
    title: normalizedProduct.title,
  });
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim();
}

