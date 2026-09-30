/** Only user-confirmed facts belong in this catalogue. */
export const CATALOG_VERSION = '2026-09-29-v1' as const;

export const products = {
  prime: { id: 'prime', name: 'Prime' },
  premium: { id: 'premium', name: 'Premium' },
} as const;

export const roofMaterials = {
  glass: {
    id: 'glass',
    nameDe: 'Glas',
    maxDepthMm: 4000,
    maxPanelWidthMm: 860,
    panelAllowanceMm: 32,
  },
  polycarbonate: {
    id: 'polycarbonate',
    nameDe: 'Polycarbonat',
    maxDepthMm: 5000,
    maxPanelWidthMm: 980,
    panelAllowanceMm: 35,
  },
} as const;

export const MAX_WIDTH_MM = 12000;
/** Confirmed 30 Sep 2026: both products, both roof materials. */
export const MIN_WIDTH_MM = 2000;
export const MIN_DEPTH_MM = 1000;
export const ROOF_SUPPORT_WIDTH_MM = 55;
/** Measured from the gutter end to the outer face of the end post, not to its centre. */
export const END_POST_MAX_INSET_MM = 500;
/** Smallest clear opening between the facing sides of two neighbouring posts. */
export const MIN_CLEAR_OPENING_MM = 900;

/** Post cross-sections (confirmed 30 Sep 2026). `alongGutterMm` is the side along the width axis. */
export const postSections = {
  prime: { alongGutterMm: 110, towardsGardenMm: 120 },
  premium: { alongGutterMm: 130, towardsGardenMm: 140 },
} as const satisfies Record<keyof typeof products, { alongGutterMm: number; towardsGardenMm: number }>;
export const SLOPE_MIN_DEGREES = 5;
export const SLOPE_MAX_DEGREES = 12;

export type ProductId = keyof typeof products;
export type RoofMaterialId = keyof typeof roofMaterials;

export function postWidthMm(productId: ProductId): number {
  return postSections[productId].alongGutterMm;
}

/** Number of posts is determined from their actual positions, not a width table. */
export function maxPostCenterGapMm(productId: ProductId, widthMm: number): number {
  return productId === 'premium' && widthMm <= 6000 ? 6000 : 4000;
}
