import { roofMaterials, ROOF_SUPPORT_WIDTH_MM, type RoofMaterialId } from '../../catalog/catalog';

export type FractionMm = { numerator: number; denominator: number };
export type RoofBayGeometry = {
  bayCount: number;
  supportCount: number;
  intermediateCapWidthMm: FractionMm;
  finalPanelWidthMm: FractionMm;
  panelWidthLimitMm: number;
  valid: boolean;
  reasons: Array<'non_positive_cap' | 'panel_too_wide'>;
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
    valid: reasons.length === 0,
    reasons,
  };
}
