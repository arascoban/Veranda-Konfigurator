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

/**
 * Roof finishes offered per roof field (confirmed 1 Oct 2026). The family (glass/polycarbonate) is the roof
 * material; the tone is what the customer picks per field. Hex/opacity are screen approximations taken
 * from the user's reference photos: opal and Milchglas nearly opaque, tinted/bronze semi-transparent.
 */
export const roofFinishes = {
  vsg_klar: { id: 'vsg_klar', family: 'glass', nameDe: 'VSG 8 mm', toneDe: 'Klar', hex: '#d3e4ee', opacity: 0.28 },
  vsg_opal: { id: 'vsg_opal', family: 'glass', nameDe: 'VSG 8 mm', toneDe: 'Opal (Milchglas)', hex: '#eef1f0', opacity: 0.94 },
  vsg_getoent: { id: 'vsg_getoent', family: 'glass', nameDe: 'VSG 8 mm', toneDe: 'Getönt', hex: '#3f474d', opacity: 0.6 },
  pc_klar: { id: 'pc_klar', family: 'polycarbonate', nameDe: 'Polycarbonat 16 mm', toneDe: 'Klar', hex: '#e4ecef', opacity: 0.45 },
  pc_opal: { id: 'pc_opal', family: 'polycarbonate', nameDe: 'Polycarbonat 16 mm', toneDe: 'Opal', hex: '#f3f5f4', opacity: 0.96 },
  pc_bronze: { id: 'pc_bronze', family: 'polycarbonate', nameDe: 'Polycarbonat 16 mm', toneDe: 'Bronze (Anthrazit)', hex: '#474c51', opacity: 0.72 },
} as const satisfies Record<string, { id: string; family: keyof typeof roofMaterials; nameDe: string; toneDe: string; hex: string; opacity: number }>;
export type RoofFinishId = keyof typeof roofFinishes;
/** Default tone of each family and the tone used for awning side fields (Milchglas). */
export const defaultRoofFinish = { glass: 'vsg_klar', polycarbonate: 'pc_klar' } as const satisfies Record<keyof typeof roofMaterials, RoofFinishId>;
export const opalRoofFinish = { glass: 'vsg_opal', polycarbonate: 'pc_opal' } as const satisfies Record<keyof typeof roofMaterials, RoofFinishId>;

/** The customer may add this many roof fields beyond the minimum (confirmed 1 Oct 2026). */
export const MAX_EXTRA_ROOF_BAYS = 2;

/**
 * Awnings (Aufglas/Unterglas-Markise), confirmed 1 Oct 2026: glass roofs only, one awning at most
 * 600 × 400 cm and at least 100 × 100 cm. Wider roofs get a 600 cm clear centre with two Milchglas
 * side fields of at most 86 cm each; beyond that two awnings are required.
 */
export const awningRules = {
  maxWidthMm: 6000, maxDepthMm: 4000, minWidthMm: 1000, minDepthMm: 1000, sideFieldMaxMm: 860,
  /** Implementation assumption (not a product rule): a side field needs at least this pitch to hold a support. */
  sideFieldMinMm: 150,
} as const;

/** LED strips sit under the rafters: at most one per started metre of depth, rounded at 50 cm (confirmed 1 Oct 2026). */
export const LED_PER_METRE_MAX = 1;

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
