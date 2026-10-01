import { awningRules, roofMaterials, ROOF_SUPPORT_WIDTH_MM, type RoofMaterialId } from '../../catalog/catalog';

export type FractionMm = { numerator: number; denominator: number };
export type RoofBayGeometry = {
  bayCount: number;
  supportCount: number;
  intermediateCapWidthMm: FractionMm;
  finalPanelWidthMm: FractionMm;
  panelWidthLimitMm: number;
  /** Cap (clear) width of every bay from left to right (mm, may be fractional). */
  capWidthsMm: number[];
  /** True when the outer bays are the Milchglas side fields of a single awning. */
  awningSideFields: boolean;
  valid: boolean;
  reasons: Array<'non_positive_cap' | 'panel_too_wide' | 'awning_side_field_out_of_range'>;
};

/** Exact integer inequality avoids accepting a panel because of display rounding. */
export function minimumRoofBayCount(widthMm: number, materialId: RoofMaterialId): number | null {
  if (!Number.isSafeInteger(widthMm) || widthMm <= ROOF_SUPPORT_WIDTH_MM) return null;
  const material = roofMaterials[materialId];
  const denominator = material.maxPanelWidthMm - material.panelAllowanceMm + ROOF_SUPPORT_WIDTH_MM;
  const count = Math.max(1, Math.ceil((widthMm - ROOF_SUPPORT_WIDTH_MM) / denominator));
  return calculateRoofBayGeometry(widthMm, materialId, count)?.valid ? count : null;
}

export function calculateRoofBayGeometry(
  widthMm: number,
  materialId: RoofMaterialId,
  bayCount: number,
): RoofBayGeometry | null {
  if (!Number.isSafeInteger(widthMm) || widthMm <= 0 || !Number.isSafeInteger(bayCount) || bayCount < 1) return null;
  const material = roofMaterials[materialId];
  const supportCount = bayCount + 1;
  const capNumerator = widthMm - ROOF_SUPPORT_WIDTH_MM * supportCount;
  const panelNumerator = capNumerator + material.panelAllowanceMm * bayCount;
  const reasons: RoofBayGeometry['reasons'] = [];
  if (capNumerator <= 0) reasons.push('non_positive_cap');
  if (panelNumerator > material.maxPanelWidthMm * bayCount) reasons.push('panel_too_wide');
  return {
    bayCount,
    supportCount,
    intermediateCapWidthMm: { numerator: capNumerator, denominator: bayCount },
    finalPanelWidthMm: { numerator: panelNumerator, denominator: bayCount },
    panelWidthLimitMm: material.maxPanelWidthMm,
    capWidthsMm: Array.from({ length: bayCount }, () => capNumerator / bayCount),
    awningSideFields: false,
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Roof layout for one awning on a roof wider than the awning: the middle is divided as if the roof were
 * `awningRules.maxWidthMm` wide, and one side field of (W − 600 cm) / 2 is added at each end (confirmed
 * 1 Oct 2026). Returns null when the width needs no side fields.
 */
export function calculateAwningSideFieldGeometry(widthMm: number, materialId: RoofMaterialId): RoofBayGeometry | null {
  const sidePitch = awningSideFieldMm(widthMm);
  if (!Number.isSafeInteger(widthMm) || sidePitch === 0) return null;
  const centreWidth = widthMm - 2 * sidePitch;
  const centreBays = minimumRoofBayCount(centreWidth, materialId);
  const centre = centreBays === null ? null : calculateRoofBayGeometry(centreWidth, materialId, centreBays);
  if (!centre) return null;
  const sideCap = sidePitch - ROOF_SUPPORT_WIDTH_MM;
  const reasons: RoofBayGeometry['reasons'] = [...centre.reasons];
  if (sidePitch > awningRules.sideFieldMaxMm) reasons.push('awning_side_field_out_of_range');
  return {
    bayCount: centre.bayCount + 2,
    supportCount: centre.supportCount + 2,
    intermediateCapWidthMm: centre.intermediateCapWidthMm,
    finalPanelWidthMm: centre.finalPanelWidthMm,
    panelWidthLimitMm: centre.panelWidthLimitMm,
    capWidthsMm: [sideCap, ...centre.capWidthsMm, sideCap],
    awningSideFields: true,
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Width of one side field (support plus cap) for a single awning: roofs up to 600 cm need none; wider roofs
 * get at least 15 cm on each side (even at 601 cm), the awning takes what remains (user decision 1 Oct 2026).
 */
export function awningSideFieldMm(widthMm: number): number {
  if (widthMm <= awningRules.maxWidthMm) return 0;
  return Math.max(awningRules.sideFieldMinMm, (widthMm - awningRules.maxWidthMm) / 2);
}
