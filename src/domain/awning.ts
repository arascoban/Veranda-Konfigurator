import { awningRules } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { awningSideFieldMm } from './geometry/roof';

export type AwningType = 'aufglas' | 'unterglas';
export type AwningSetting = NonNullable<ConfigurationV1['awning']>;

/** Rules confirmed 1 Oct 2026: see `awningRules` in the catalogue. */
export type AwningAvailability = {
  /** False on polycarbonate roofs and while the measurements are incomplete or too small. */
  available: boolean;
  reason: 'polycarbonate' | 'measurements' | 'depth_too_small' | null;
  /** One awning: covers the whole width, or a 600 cm centre with Milchglas side fields, or impossible. */
  singleMode: 'full' | 'side_fields' | 'unavailable';
  sideFieldMm: number;
  depthMaxMm: number;
};

export function awningAvailability(configuration: ConfigurationV1): AwningAvailability {
  const { width, depth } = configuration.dimensionsMm;
  const none: AwningAvailability = { available: false, reason: null, singleMode: 'unavailable', sideFieldMm: 0, depthMaxMm: 0 };
  if (configuration.roofMaterialId !== 'glass') return { ...none, reason: 'polycarbonate' };
  if (width === null || depth === null) return { ...none, reason: 'measurements' };
  const depthMaxMm = Math.min(depth, awningRules.maxDepthMm);
  if (depthMaxMm < awningRules.minDepthMm) return { ...none, reason: 'depth_too_small', depthMaxMm };
  const sideFieldMm = awningSideFieldMm(width);
  const singleMode = sideFieldMm === 0 ? 'full'
    : sideFieldMm >= awningRules.sideFieldMinMm && sideFieldMm <= awningRules.sideFieldMaxMm ? 'side_fields' : 'unavailable';
  return { available: true, reason: null, singleMode, sideFieldMm, depthMaxMm };
}

/** Default setting when the customer switches an awning type on. */
export function createAwning(configuration: ConfigurationV1, type: AwningType): AwningSetting | null {
  const availability = awningAvailability(configuration);
  const width = configuration.dimensionsMm.width;
  if (!availability.available || width === null) return null;
  const count = availability.singleMode === 'unavailable' ? 2 : 1;
  return { type, count, widthsMm: count === 2 ? defaultTwoWidths(width) : null, depthMm: availability.depthMaxMm };
}

export function defaultTwoWidths(widthMm: number): [number, number] {
  const left = Math.round(widthMm / 2);
  return [left, widthMm - left];
}

/** Resolved awning spans along the width axis (scene x from the inside-left end). */
export function awningSpans(configuration: ConfigurationV1): Array<{ xMm: number; widthMm: number; depthMm: number; type: AwningType }> {
  const awning = configuration.awning;
  const width = configuration.dimensionsMm.width;
  if (!awning || width === null) return [];
  if (awning.count === 2) {
    const [a, b] = awning.widthsMm ?? defaultTwoWidths(width);
    return [{ xMm: 0, widthMm: a, depthMm: awning.depthMm, type: awning.type }, { xMm: a, widthMm: b, depthMm: awning.depthMm, type: awning.type }];
  }
  const side = awningSideFieldMm(width);
  return [{ xMm: side, widthMm: width - 2 * side, depthMm: awning.depthMm, type: awning.type }];
}

export type AwningIssueCode = 'awning_requires_glass' | 'awning_single_not_possible' | 'awning_width_out_of_range' | 'awning_depth_out_of_range';

export function validateAwning(configuration: ConfigurationV1): AwningIssueCode[] {
  const awning = configuration.awning;
  if (!awning) return [];
  const availability = awningAvailability(configuration);
  const width = configuration.dimensionsMm.width;
  if (availability.reason === 'polycarbonate') return ['awning_requires_glass'];
  if (!availability.available || width === null) return availability.reason === 'depth_too_small' ? ['awning_depth_out_of_range'] : [];
  const issues: AwningIssueCode[] = [];
  if (awning.count === 1 && availability.singleMode === 'unavailable') issues.push('awning_single_not_possible');
  if (awning.count === 2) {
    const [a, b] = awning.widthsMm ?? defaultTwoWidths(width);
    const inRange = (value: number) => value >= awningRules.minWidthMm && value <= awningRules.maxWidthMm;
    if (!inRange(a) || !inRange(b) || a + b !== width) issues.push('awning_width_out_of_range');
  }
  if (awning.depthMm < awningRules.minDepthMm || awning.depthMm > availability.depthMaxMm) issues.push('awning_depth_out_of_range');
  return issues;
}

/** Keeps a stored awning consistent after a measurement or material change; drops it when impossible. */
export function reconcileAwning(configuration: ConfigurationV1): ConfigurationV1['awning'] {
  const awning = configuration.awning;
  if (!awning) return null;
  const availability = awningAvailability(configuration);
  const width = configuration.dimensionsMm.width;
  if (!availability.available || width === null) return null;
  const count = awning.count === 1 && availability.singleMode === 'unavailable' ? 2 : awning.count;
  const widths = count === 2
    ? (awning.widthsMm && awning.widthsMm[0] + awning.widthsMm[1] === width ? awning.widthsMm : defaultTwoWidths(width))
    : null;
  return { ...awning, count, widthsMm: widths, depthMm: Math.min(Math.max(awning.depthMm, awningRules.minDepthMm), availability.depthMaxMm) };
}
