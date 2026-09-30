import { SLOPE_MAX_DEGREES, SLOPE_MIN_DEGREES } from '../../catalog/catalog';

/** Installation offsets must come from an approved part manifest, never a sample assembly. */
export type RoofAttachmentOffsetsMm = {
  rearConnectionAboveWallUndersideMm: number;
  frontConnectionAboveGutterUndersideMm: number;
  horizontalRunAdjustmentMm: number;
};

export type SlopeResult =
  | { status: 'missing_reference' }
  | { status: 'invalid_geometry' }
  | { status: 'calculated'; degrees: number; withinLimit: boolean };

export function calculateRoofSlope(
  depthMm: number,
  rearHeightMm: number,
  frontHeightMm: number,
  offsets: RoofAttachmentOffsetsMm | null,
): SlopeResult {
  if (!offsets) return { status: 'missing_reference' };
  const values = [depthMm, rearHeightMm, frontHeightMm, offsets.rearConnectionAboveWallUndersideMm,
    offsets.frontConnectionAboveGutterUndersideMm, offsets.horizontalRunAdjustmentMm];
  if (values.some((value) => !Number.isFinite(value))) return { status: 'invalid_geometry' };
  const runMm = depthMm + offsets.horizontalRunAdjustmentMm;
  const rearContactMm = rearHeightMm + offsets.rearConnectionAboveWallUndersideMm;
  const frontContactMm = frontHeightMm + offsets.frontConnectionAboveGutterUndersideMm;
  if (runMm <= 0 || rearContactMm <= frontContactMm) return { status: 'invalid_geometry' };
  const degrees = Math.atan2(rearContactMm - frontContactMm, runMm) * 180 / Math.PI;
  return {
    status: 'calculated',
    degrees,
    withinLimit: degrees >= SLOPE_MIN_DEGREES - 1e-10 && degrees <= SLOPE_MAX_DEGREES + 1e-10,
  };
}
