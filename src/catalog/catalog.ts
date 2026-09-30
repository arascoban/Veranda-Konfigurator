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

/** Frame (aluminium) colours offered to the customer (confirmed 30 Sep 2026). Hex values are screen approximations. */
export const frameColors = {
  ral7016: { id: 'ral7016', ral: 'RAL 7016', nameDe: 'Anthrazit', hex: '#383E42' },
  ral9001: { id: 'ral9001', ral: 'RAL 9001', nameDe: 'Cremeweiß', hex: '#FDF4E3' },
} as const;
export type FrameColorId = keyof typeof frameColors;

export const MAX_WIDTH_MM = 12000;
/** Confirmed 30 Sep 2026: both products, both roof materials. */
export const MIN_WIDTH_MM = 2000;
export const MIN_DEPTH_MM = 1000;
/** Front height (ground to gutter underside) range confirmed 30 Sep 2026. */
export const MIN_FRONT_HEIGHT_MM = 500;
export const MAX_FRONT_HEIGHT_MM = 5000;
/** Roofs wider than this need a drain pipe on both end posts (confirmed 30 Sep 2026). */
export const DRAIN_BOTH_SIDES_ABOVE_MM = 8000;
/** Default roof slope for a new draft; the angle is kept while the customer changes other measurements. */
export const DEFAULT_SLOPE_DEGREES = 8;
export const ROOF_SUPPORT_WIDTH_MM = 55;
/** Measured from the gutter end to the outer face of the end post, not to its centre. */
export const END_POST_MAX_INSET_MM = 500;
/** Smallest clear opening between the facing sides of two neighbouring posts. */
export const MIN_CLEAR_OPENING_MM = 900;

/**
 * Post cross-sections. `alongGutterMm` is the side along the width axis (confirmed 30 Sep 2026).
 * The garden-facing depth is taken from the SketchUp reference assemblies (both 135 mm), as the user
 * decided on 30 Sep 2026 that the model is authoritative.
 */
export const postSections = {
  prime: { alongGutterMm: 110, towardsGardenMm: 135 },
  premium: { alongGutterMm: 130, towardsGardenMm: 135 },
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
