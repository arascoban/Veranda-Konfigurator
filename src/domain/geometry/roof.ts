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
  /**
   * Corner rafter moved with an inset end post (owner rule 3 Oct 2026): the end rafter stays at the gutter end and
   * one more rafter stands over the post; the bay between them is narrow. Pitch = gutter end to post outer face, mm.
   * `left`/`right` as seen from the garden (garden-right = inside x = 0).
   */
  postSideFields?: { leftMm?: number; rightMm?: number };
  /** Smallest selectable bay count of this layout (includes the narrow corner bays). */
  minimumBayCount?: number;
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

/** Narrowest corner bay that is built (cap ≥ 5 cm; provisional, 3 Oct 2026); smaller insets keep the plain layout. */
export const MIN_CORNER_CAP_MM = 50;

/**
 * Roof with narrow corner bays over inset end posts. `rightPitchMm` sits at x = 0 (garden-right), `leftPitchMm` at
 * x = W. The rest is divided equally with the minimum bay count plus `extraBays` (the customer's +0…+2).
 */
export function calculatePostSideFieldGeometry(widthMm: number, materialId: RoofMaterialId, extraBays: number,
  sides: { leftMm?: number; rightMm?: number }): RoofBayGeometry | null {
  const right = sides.rightMm ?? 0;
  const left = sides.leftMm ?? 0;
  const centreWidth = widthMm - right - left;
  const minimumCentre = minimumRoofBayCount(centreWidth, materialId);
  if (minimumCentre === null) return null;
  const centre = calculateRoofBayGeometry(centreWidth, materialId, minimumCentre + Math.max(0, extraBays));
  if (!centre) return null;
  const caps = [...(right ? [right - ROOF_SUPPORT_WIDTH_MM] : []), ...centre.capWidthsMm, ...(left ? [left - ROOF_SUPPORT_WIDTH_MM] : [])];
  const extra = (right ? 1 : 0) + (left ? 1 : 0);
  return {
    ...centre,
    bayCount: centre.bayCount + extra,
    supportCount: centre.supportCount + extra,
    capWidthsMm: caps,
    postSideFields: { ...(left ? { leftMm: left } : {}), ...(right ? { rightMm: right } : {}) },
    minimumBayCount: minimumCentre + extra,
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
