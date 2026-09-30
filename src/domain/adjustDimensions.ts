import { attachmentReferences } from '../catalog/attachmentReference';
import { DEFAULT_SLOPE_DEGREES, MAX_FRONT_HEIGHT_MM, MAX_WIDTH_MM, MIN_DEPTH_MM, MIN_FRONT_HEIGHT_MM, MIN_WIDTH_MM, roofMaterials, type ProductId } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { calculateRoofSlope, rearHeightForSlope, rearHeightRange } from './geometry/slope';

export type DimensionKey = keyof ConfigurationV1['dimensionsMm'];

/** Integer millimetre range the customer may enter for a field, given the rest of the configuration. */
export function dimensionRange(configuration: ConfigurationV1, field: DimensionKey): { minMm: number; maxMm: number } | null {
  const { depth, frontHeight } = configuration.dimensionsMm;
  switch (field) {
    case 'width': return { minMm: MIN_WIDTH_MM, maxMm: MAX_WIDTH_MM };
    case 'depth': return { minMm: MIN_DEPTH_MM, maxMm: roofMaterials[configuration.roofMaterialId].maxDepthMm };
    case 'frontHeight': return { minMm: MIN_FRONT_HEIGHT_MM, maxMm: MAX_FRONT_HEIGHT_MM };
    case 'rearHeight': return rearHeightRange(depth, frontHeight, attachmentReferences[configuration.productId]);
  }
}

/** Current slope if it can be calculated, otherwise the 8° default of a new draft. */
export function currentSlopeDegrees(configuration: ConfigurationV1): number {
  const { depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  if (depth === null || rearHeight === null || frontHeight === null) return DEFAULT_SLOPE_DEGREES;
  const slope = calculateRoofSlope(depth, rearHeight, frontHeight, attachmentReferences[configuration.productId]);
  return slope.status === 'calculated' ? slope.degrees : DEFAULT_SLOPE_DEGREES;
}

function clamp(value: number, range: { minMm: number; maxMm: number } | null): number {
  return range ? Math.min(range.maxMm, Math.max(range.minMm, value)) : value;
}

/**
 * Applies one measurement. Changing depth or the front height keeps the roof slope and recalculates the
 * rear height (decided 30 Sep 2026); a changed rear height changes the slope instead. Values outside
 * the permitted range are rejected (null) rather than silently clamped.
 */
export function withDimension(configuration: ConfigurationV1, field: DimensionKey, valueMm: number | null): ConfigurationV1 | null {
  if (valueMm !== null) {
    const range = dimensionRange(configuration, field);
    if (range && (valueMm < range.minMm || valueMm > range.maxMm)) return null;
  }
  const next: ConfigurationV1 = { ...configuration, dimensionsMm: { ...configuration.dimensionsMm, [field]: valueMm } };
  if ((field === 'depth' || field === 'frontHeight') && valueMm !== null) {
    const degrees = currentSlopeDegrees(configuration);
    const front = next.dimensionsMm.frontHeight;
    const depth = next.dimensionsMm.depth;
    if (front !== null && depth !== null) {
      const offsets = attachmentReferences[configuration.productId];
      next.dimensionsMm.rearHeight = clamp(rearHeightForSlope(depth, front, degrees, offsets), rearHeightRange(depth, front, offsets));
    }
  }
  return next;
}

/** Product change keeps the customer's measurements and slope; only the product's own offsets differ. */
export function withProduct(configuration: ConfigurationV1, productId: ProductId): ConfigurationV1 {
  const degrees = currentSlopeDegrees(configuration);
  const next: ConfigurationV1 = { ...configuration, productId, dimensionsMm: { ...configuration.dimensionsMm } };
  const { depth, frontHeight } = next.dimensionsMm;
  if (depth !== null && frontHeight !== null) {
    const offsets = attachmentReferences[productId];
    next.dimensionsMm.rearHeight = clamp(rearHeightForSlope(depth, frontHeight, degrees, offsets), rearHeightRange(depth, frontHeight, offsets));
  }
  return next;
}
