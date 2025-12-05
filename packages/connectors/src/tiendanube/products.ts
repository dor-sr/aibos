/**
 * Tiendanube Product Sync
 */

import { db } from '@aibos/data-model';
import { ecommerceProducts } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { TiendanubeClient } from './client';
import type { TiendanubeProduct, TiendanubeSyncOptions } from './types';

/**
 * Get product name from localized object
 */
function getLocalizedName(names: Record<string, string>): string {
  // Prefer Spanish, then English, then first available
  return names['es'] || names['en'] || names['pt'] || Object.values(names)[0] || '';
}

/**
 * Transform Tiendanube product to internal format
 */
function transformProduct(product: TiendanubeProduct, workspaceId: string) {
  const defaultVariant = product.variants[0];
  const mainImage = product.images[0];

  return {
    workspaceId,
    externalId: String(product.id),
    source: 'tiendanube',
    title: getLocalizedName(product.name),
    description: getLocalizedName(product.description),
    vendor: product.brand || null,
    productType: product.categories[0] ? getLocalizedName(product.categories[0].name) : null,
    status: product.published ? 'active' : 'draft',
    price: defaultVariant?.price || '0',
    compareAtPrice: defaultVariant?.compare_at_price || null,
    currency: 'ARS', // Default to ARS for Tiendanube
    sku: defaultVariant?.sku || null,
    barcode: defaultVariant?.barcode || null,
    inventoryQuantity: defaultVariant?.stock ?? 0,
    imageUrl: mainImage?.src || null,
    tags: product.tags,
    metadata: {
      handle: getLocalizedName(product.handle),
      videoUrl: product.video_url,
      freeShipping: product.free_shipping,
      requiresShipping: product.requires_shipping,
      canonicalUrl: product.canonical_url,
      seoTitle: getLocalizedName(product.seo_title),
      seoDescription: getLocalizedName(product.seo_description),
      categories: product.categories.map(c => ({
        id: c.id,
        name: getLocalizedName(c.name),
      })),
      variants: product.variants.map(v => ({
        id: v.id,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        sku: v.sku,
        barcode: v.barcode,
        stock: v.stock,
        values: v.values,
      })),
    },
    sourceCreatedAt: new Date(product.created_at),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Sync products from Tiendanube
 */
export async function syncTiendanubeProducts(
  client: TiendanubeClient,
  workspaceId: string,
  options: TiendanubeSyncOptions = {}
): Promise<number> {
  const products = await client.fetchAllProducts(options);
  let processedCount = 0;

  for (const product of products) {
    const productData = transformProduct(product, workspaceId);

    // Check if product exists
    const existing = await db
      .select()
      .from(ecommerceProducts)
      .where(
        and(
          eq(ecommerceProducts.workspaceId, workspaceId),
          eq(ecommerceProducts.externalId, String(product.id))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing product
      await db
        .update(ecommerceProducts)
        .set({
          ...productData,
          updatedAt: new Date(),
        })
        .where(eq(ecommerceProducts.id, existing[0]!.id));
    } else {
      // Insert new product
      await db.insert(ecommerceProducts).values({
        ...productData,
        id: crypto.randomUUID(),
      });
    }

    processedCount++;
  }

  return processedCount;
}

/**
 * Get internal product ID from Tiendanube external ID
 */
export async function getInternalProductId(
  workspaceId: string,
  externalId: string
): Promise<string | null> {
  const result = await db
    .select({ id: ecommerceProducts.id })
    .from(ecommerceProducts)
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.externalId, externalId)
      )
    )
    .limit(1);

  return result[0]?.id || null;
}

/**
 * Process a single product from webhook
 */
export async function processTiendanubeProduct(
  product: TiendanubeProduct,
  workspaceId: string
): Promise<string> {
  const productData = transformProduct(product, workspaceId);

  const existing = await db
    .select()
    .from(ecommerceProducts)
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.externalId, String(product.id))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(ecommerceProducts)
      .set({
        ...productData,
        updatedAt: new Date(),
      })
      .where(eq(ecommerceProducts.id, existing[0]!.id));
    return existing[0]!.id;
  } else {
    const id = crypto.randomUUID();
    await db.insert(ecommerceProducts).values({
      ...productData,
      id,
    });
    return id;
  }
}

/**
 * Delete a product from webhook
 */
export async function deleteTiendanubeProduct(
  workspaceId: string,
  externalId: string
): Promise<void> {
  await db
    .delete(ecommerceProducts)
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.externalId, externalId)
      )
    );
}
