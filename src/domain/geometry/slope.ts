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

/** Rear height (mm, integer) that gives the requested slope for the given depth and front height. */
export function rearHeightForSlope(depthMm: number, frontHeightMm: number, degrees: number, offsets: RoofAttachmentOffsetsMm): number {
  const runMm = depthMm + offsets.horizontalRunAdjustmentMm;
  const frontContactMm = frontHeightMm + offsets.frontConnectionAboveGutterUndersideMm;
  const rearContactMm = frontContactMm + Math.tan(degrees * Math.PI / 180) * runMm;
  return Math.round(rearContactMm - offsets.rearConnectionAboveWallUndersideMm);
}

/** Integer rear heights allowed by the 5°–12° rule; null when depth or front height is not usable. */
export function rearHeightRange(depthMm: number | null, frontHeightMm: number | null, offsets: RoofAttachmentOffsetsMm): { minMm: number; maxMm: number } | null {
  if (depthMm === null || frontHeightMm === null || depthMm + offsets.horizontalRunAdjustmentMm <= 0) return null;
  const at = (degrees: number) => {
    const runMm = depthMm + offsets.horizontalRunAdjustmentMm;
    return frontHeightMm + offsets.frontConnectionAboveGutterUndersideMm + Math.tan(degrees * Math.PI / 180) * runMm - offsets.rearConnectionAboveWallUndersideMm;
  };
  return { minMm: Math.ceil(at(SLOPE_MIN_DEGREES) - 1e-9), maxMm: Math.floor(at(SLOPE_MAX_DEGREES) + 1e-9) };
}

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
