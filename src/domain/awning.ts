import { awningRules, postSections } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { awningSideFieldMm } from './geometry/roof';

export type AwningType = 'aufglas' | 'unterglas';
export type AwningSetting = NonNullable<ConfigurationV1['awning']>;

/** Rules confirmed 1 Oct 2026: see `awningRules` in the catalogue. */
export type AwningAvailability = {
  /** False on polycarbonate roofs and while the measurements are incomplete or too small. */
  available: boolean;
  reason: 'polycarbonate' | 'measurements' | 'depth_too_small' | null;
  /** One awning: covers the whole width, or a centre with Milchglas side fields, or impossible. */
  singleMode: 'full' | 'side_fields' | 'unavailable';
  sideFieldMm: number;
};

/**
 * The awning depth is never entered: an Unterglas awning runs from the back of the posts to the wall, an
 * Aufglas awning is as long as the rafter cover (user decision 1 Oct 2026). Aufglas is resolved by the
 * assembly layout, which knows the rafter length; here it is reported as null.
 */
export function awningDepthMm(configuration: ConfigurationV1, type: AwningType): number | null {
  const depth = configuration.dimensionsMm.depth;
  if (depth === null) return null;
  return type === 'unterglas' ? depth - postSections[configuration.productId].towardsGardenMm : null;
}

export function awningAvailability(configuration: ConfigurationV1): AwningAvailability {
  const { width, depth } = configuration.dimensionsMm;
  const none: AwningAvailability = { available: false, reason: null, singleMode: 'unavailable', sideFieldMm: 0 };
  if (configuration.roofMaterialId !== 'glass') return { ...none, reason: 'polycarbonate' };
  if (width === null || depth === null) return { ...none, reason: 'measurements' };
  if (depth - postSections[configuration.productId].towardsGardenMm < awningRules.minDepthMm) return { ...none, reason: 'depth_too_small' };
  const sideFieldMm = awningSideFieldMm(width);
  const singleMode = sideFieldMm === 0 ? 'full' : sideFieldMm <= awningRules.sideFieldMaxMm ? 'side_fields' : 'unavailable';
  return { available: true, reason: null, singleMode, sideFieldMm };
}

/** Default setting when the customer switches the awning on (Unterglas by default). */
export function createAwning(configuration: ConfigurationV1, type: AwningType = 'unterglas'): AwningSetting | null {
  const availability = awningAvailability(configuration);
  const width = configuration.dimensionsMm.width;
  if (!availability.available || width === null) return null;
  const count = availability.singleMode === 'unavailable' ? 2 : 1;
  return { type, count, widthsMm: count === 2 ? defaultTwoWidths(width) : null, motorSide: 'left', fabricId: 'stoff-1' };
}

export function defaultTwoWidths(widthMm: number): [number, number] {
  const left = Math.round(widthMm / 2);
  return [left, widthMm - left];
}

/** Resolved awning spans along the width axis (scene x from the inside-left end); depth null = rafter cover length. */
export function awningSpans(configuration: ConfigurationV1): Array<{ xMm: number; widthMm: number; depthMm: number | null; type: AwningType }> {
  const awning = configuration.awning;
  const width = configuration.dimensionsMm.width;
  if (!awning || width === null) return [];
  const depthMm = awningDepthMm(configuration, awning.type);
  if (awning.count === 2) {
    const [a, b] = awning.widthsMm ?? defaultTwoWidths(width);
    return [{ xMm: 0, widthMm: a, depthMm, type: awning.type }, { xMm: a, widthMm: b, depthMm, type: awning.type }];
  }
  const side = awningSideFieldMm(width);
  return [{ xMm: side, widthMm: width - 2 * side, depthMm, type: awning.type }];
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
  return { ...awning, count, widthsMm: widths };
}

/** German notice when a choice had to be adjusted automatically; null when nothing changed for the customer. */
export function awningChangeNotice(before: ConfigurationV1['awning'], after: ConfigurationV1['awning'], configuration: ConfigurationV1): { title: string; message: string } | null {
  if (!after) return before ? { title: 'Markise entfernt', message: 'Mit dieser Dacheindeckung oder Tiefe ist keine Markise möglich; die Markise wurde entfernt.' } : null;
  const availability = awningAvailability(configuration);
  const typeName = after.type === 'aufglas' ? 'Aufglas-Markise' : 'Unterglas-Markise';
  if (after.count === 2 && (!before || before.count === 1)) {
    return { title: `Gekoppelte ${typeName}`, message: 'Aufgrund der Breite werden zwei gekoppelte Markisen eingesetzt.' };
  }
  if (after.count === 1 && availability.singleMode === 'side_fields' && (!before || before.type !== after.type || before.count !== 1)) {
    const cm = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(availability.sideFieldMm / 10);
    return { title: typeName, message: `Die Breite liegt über 600 cm: die beiden äußeren Dachfelder (je ${cm} cm) werden in Milchglas ausgeführt, die Markise deckt die Mitte.` };
  }
  return null;
}
