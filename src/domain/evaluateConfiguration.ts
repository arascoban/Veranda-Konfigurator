import { MAX_WIDTH_MM, MIN_DEPTH_MM, MIN_WIDTH_MM, roofMaterials } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { calculateRoofBayGeometry, minimumRoofBayCount, type RoofBayGeometry } from './geometry/roof';
import { validatePostCenters } from './geometry/posts';
import { calculateRoofSlope, type RoofAttachmentOffsetsMm, type SlopeResult } from './geometry/slope';

export type RuleIssue = {
  kind: 'invalid' | 'missing' | 'unverified';
  field: string;
  code: string;
};

export type ConfigurationEvaluation = {
  status: 'invalid' | 'incomplete' | 'requires_engineering_review';
  issues: RuleIssue[];
  roof: RoofBayGeometry | null;
  slope: SlopeResult | null;
  /** No result is labelled manufacturable until all engineering and price rules exist. */
  manufacturable: false;
};

export function evaluateConfiguration(
  configuration: ConfigurationV1,
  attachmentOffsets: RoofAttachmentOffsetsMm | null = null,
): ConfigurationEvaluation {
  const issues: RuleIssue[] = [];
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  for (const [field, value] of Object.entries(configuration.dimensionsMm)) {
    if (value === null) issues.push({ kind: 'missing', field: `dimensionsMm.${field}`, code: 'measurement_required' });
    else if (!Number.isSafeInteger(value) || value <= 0) {
      issues.push({ kind: 'invalid', field: `dimensionsMm.${field}`, code: 'positive_integer_mm_required' });
    }
  }
  if (width !== null && width > MAX_WIDTH_MM) {
    issues.push({ kind: 'invalid', field: 'dimensionsMm.width', code: 'width_above_1200_cm' });
  } else if (width !== null && width > 0 && width < MIN_WIDTH_MM) {
    issues.push({ kind: 'invalid', field: 'dimensionsMm.width', code: 'width_below_200_cm' });
  }
  const material = roofMaterials[configuration.roofMaterialId];
  if (depth !== null && depth > material.maxDepthMm) {
    issues.push({ kind: 'invalid', field: 'dimensionsMm.depth', code: 'depth_above_material_limit' });
  } else if (depth !== null && depth > 0 && depth < MIN_DEPTH_MM) {
    issues.push({ kind: 'invalid', field: 'dimensionsMm.depth', code: 'depth_below_100_cm' });
  }

  let roof: RoofBayGeometry | null = null;
  if (width !== null && Number.isSafeInteger(width) && width > 0 && width <= MAX_WIDTH_MM) {
    const requestedBays = configuration.roofBayCount ?? minimumRoofBayCount(width, configuration.roofMaterialId);
    if (requestedBays === null) {
      issues.push({ kind: 'invalid', field: 'dimensionsMm.width', code: 'roof_bays_not_possible' });
    } else {
      roof = calculateRoofBayGeometry(width, configuration.roofMaterialId, requestedBays);
      for (const reason of roof?.reasons ?? []) {
        issues.push({ kind: 'invalid', field: 'roofBayCount', code: reason });
      }
      if (roof?.valid) {
        issues.push({ kind: 'unverified', field: 'roofBayCount', code: 'minimum_cut_width_not_supplied' });
      }
    }
  }

  if (width !== null && Number.isSafeInteger(width) && width > 0 && width <= MAX_WIDTH_MM) {
    if (configuration.postCenters === null) {
      issues.push({ kind: 'missing', field: 'postCenters', code: 'post_layout_not_selected' });
    } else {
      for (const reason of validatePostCenters(configuration.productId, width, configuration.postCenters)) {
        issues.push({ kind: 'invalid', field: 'postCenters', code: reason });
      }
      if (configuration.postCenters.length >= 2) {
        issues.push({ kind: 'unverified', field: 'postCenters', code: 'minimum_gap_and_outer_mount_not_supplied' });
      }
    }
  }

  let slope: SlopeResult | null = null;
  if (depth !== null && rearHeight !== null && frontHeight !== null && depth > 0 && rearHeight > 0 && frontHeight > 0) {
    slope = calculateRoofSlope(depth, rearHeight, frontHeight, attachmentOffsets);
    if (slope.status === 'missing_reference') {
      issues.push({ kind: 'unverified', field: 'dimensionsMm', code: 'roof_attachment_offsets_not_supplied' });
    } else if (slope.status === 'invalid_geometry' || !slope.withinLimit) {
      issues.push({ kind: 'invalid', field: 'dimensionsMm', code: 'roof_slope_outside_5_to_12_degrees' });
    }
  }

  // Real prices, fixings and engineering checks are still absent from the catalogue.
  issues.push({ kind: 'unverified', field: 'catalog', code: 'engineering_and_price_rules_incomplete' });

  const status = issues.some((issue) => issue.kind === 'invalid') ? 'invalid'
    : issues.some((issue) => issue.kind === 'missing') ? 'incomplete'
      : 'requires_engineering_review';
  return { status, issues, roof, slope, manufacturable: false };
}
