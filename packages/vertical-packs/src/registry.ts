import type { VerticalType } from '@aibos/core';
import type { VerticalPack } from './types';
import { ecommercePack } from './ecommerce';
import { saasPack } from './saas';
import { genericPack } from './generic';
import { hospitalityPack } from './hospitality';
import { restaurantPack } from './restaurant';
import { agencyPack } from './agency';
import { servicesPack } from './services';

/**
 * Registry of all available vertical packs
 */
const verticalPacks: Record<string, VerticalPack> = {
  ecommerce: ecommercePack,
  saas: saasPack,
  hospitality: hospitalityPack,
  restaurant: restaurantPack,
  agency: agencyPack,
  services: servicesPack,
  generic: genericPack,
};

/**
 * Get a vertical pack by type
 */
export function getVerticalPack(type: VerticalType): VerticalPack {
  const pack = verticalPacks[type];
  
  if (!pack) {
    // Fall back to generic
    return verticalPacks.generic!;
  }
  
  return pack;
}

/**
 * Get all available vertical packs
 */
export function getAllVerticalPacks(): VerticalPack[] {
  return Object.values(verticalPacks);
}

/**
 * Get supported vertical types
 */
export function getSupportedVerticals(): VerticalType[] {
  return Object.keys(verticalPacks) as VerticalType[];
}

/**
 * Check if a vertical is supported
 */
export function isVerticalSupported(type: string): type is VerticalType {
  return type in verticalPacks;
}

/**
 * Get vertical packs by category
 */
export function getVerticalPacksByCategory(): {
  commerce: VerticalPack[];
  subscription: VerticalPack[];
  service: VerticalPack[];
  other: VerticalPack[];
} {
  return {
    commerce: [ecommercePack, restaurantPack, hospitalityPack],
    subscription: [saasPack],
    service: [servicesPack, agencyPack],
    other: [genericPack],
  };
}

