/**
 * MercadoLibre Listings Sync
 */

import { db } from '@aibos/data-model';
import { ecommerceProducts } from '@aibos/data-model';
import { eq, and } from 'drizzle-orm';
import type { MercadoLibreClient } from './client';
import type { MercadoLibreItem, MercadoLibreSyncOptions } from './types';

/**
 * Transform MercadoLibre item to internal product format
 */
function transformListing(item: MercadoLibreItem, workspaceId: string) {
  const mainImage = item.pictures[0];

  // Find brand attribute
  const brandAttr = item.attributes.find(a => a.id === 'BRAND');
  
  return {
    workspaceId,
    externalId: item.id,
    source: 'mercadolibre',
    title: item.title,
    description: item.subtitle || '',
    vendor: brandAttr?.value_name || null,
    productType: item.category_id,
    status: item.status === 'active' ? 'active' : 'draft',
    price: String(item.price),
    compareAtPrice: item.original_price ? String(item.original_price) : null,
    currency: item.currency_id,
    sku: item.catalog_product_id || null,
    barcode: null,
    inventoryQuantity: item.available_quantity,
    imageUrl: mainImage?.secure_url || mainImage?.url || null,
    tags: item.deal_ids,
    metadata: {
      siteId: item.site_id,
      sellerId: item.seller_id,
      categoryId: item.category_id,
      condition: item.condition,
      listingTypeId: item.listing_type_id,
      buyingMode: item.buying_mode,
      permalink: item.permalink,
      soldQuantity: item.sold_quantity,
      initialQuantity: item.initial_quantity,
      freeShipping: item.shipping.free_shipping,
      logisticType: item.shipping.logistic_type,
      shippingMode: item.shipping.mode,
      acceptsMercadopago: item.accepts_mercadopago,
      health: item.health,
      catalogListing: item.catalog_listing,
      channels: item.channels,
      variations: item.variations.map(v => ({
        id: v.id,
        price: v.price,
        availableQuantity: v.available_quantity,
        soldQuantity: v.sold_quantity,
        attributes: v.attribute_combinations,
      })),
      attributes: item.attributes,
      pictures: item.pictures.map(p => ({
        id: p.id,
        url: p.secure_url || p.url,
      })),
    },
    sourceCreatedAt: new Date(item.date_created),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Sync listings from MercadoLibre
 */
export async function syncMercadoLibreListings(
  client: MercadoLibreClient,
  workspaceId: string,
  options: MercadoLibreSyncOptions = {}
): Promise<number> {
  const items = await client.fetchAllItems();
  let processedCount = 0;

  for (const item of items) {
    const productData = transformListing(item, workspaceId);

    // Check if product exists
    const existing = await db
      .select()
      .from(ecommerceProducts)
      .where(
        and(
          eq(ecommerceProducts.workspaceId, workspaceId),
          eq(ecommerceProducts.externalId, item.id)
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
 * Get internal product ID from MercadoLibre external ID
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
 * Process a single listing from webhook
 */
export async function processMercadoLibreListing(
  item: MercadoLibreItem,
  workspaceId: string
): Promise<string> {
  const productData = transformListing(item, workspaceId);

  const existing = await db
    .select()
    .from(ecommerceProducts)
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.externalId, item.id)
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
 * Update listing status (pause, close, etc.)
 */
export async function updateMercadoLibreListingStatus(
  workspaceId: string,
  externalId: string,
  status: 'active' | 'paused' | 'closed'
): Promise<void> {
  const internalStatus = status === 'active' ? 'active' : 'draft';
  
  await db
    .update(ecommerceProducts)
    .set({
      status: internalStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ecommerceProducts.workspaceId, workspaceId),
        eq(ecommerceProducts.externalId, externalId)
      )
    );
}
