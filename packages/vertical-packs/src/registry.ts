import type { VerticalType } from '@aibos/core';
import type { VerticalPack } from './types';
import { ecommercePack } from './ecommerce';
import { saasPack } from './saas';
import { genericPack } from './generic';

/**
 * Registry of all available vertical packs
 */
const verticalPacks: Record<string, VerticalPack> = {
  ecommerce: ecommercePack,
  saas: saasPack,
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

