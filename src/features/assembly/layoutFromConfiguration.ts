import type { ConfigurationV1 } from '../../domain/configuration';
import { awningSpans } from '../../domain/awning';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { listFields } from '../../domain/fieldEquipment';
import { resolveRoofFieldFinishes } from '../../domain/roofFinish';
import { buildAssemblyLayout, postFrame, rafterUndersideAt, type AssemblyLayout } from './placements';
/** Layout for a complete, rule-valid configuration; null otherwise. */
export function assemblyLayoutFromConfiguration(configuration: ConfigurationV1): AssemblyLayout | null {
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  if (width === null || depth === null || rearHeight === null || frontHeight === null || !configuration.postCenters?.length) return null;
  const evaluation = evaluateConfiguration(configuration);
  // An out-of-range slope is still drawn so the customer sees what the message describes.
  const blocking = evaluation.issues.some((issue) => issue.kind === 'invalid' && issue.code !== 'roof_slope_outside_5_to_12_degrees');
  if (!evaluation.roof?.valid || blocking) return null;
  const layout = buildAssemblyLayout({
    productId: configuration.productId, roofMaterialId: configuration.roofMaterialId,
    postCapStyle: configuration.postCapStyle, drainSide: configuration.drainSide, frameColor: configuration.frameColor,
    widthMm: width, depthMm: depth, rearHeightMm: rearHeight, frontHeightMm: frontHeight,
    bayCount: evaluation.roof.bayCount, capWidthsMm: evaluation.roof.capWidthsMm,
    roofFinishes: resolveRoofFieldFinishes(configuration, evaluation.roof),
    awnings: awningSpans(configuration),
    postCentersMm: configuration.postCenters.map((post) => post.xMm),
    postInsetMm: configuration.postInsetMm,
  });
  // Pick areas of the sides lie just outside the end posts' outer faces, in front of any side element.
  const posts = configuration.postCenters;
  const frame = postFrame(configuration.productId);
  const sideOuterX = (side: 'left' | 'right') => side === 'left' ? posts[posts.length - 1].xMm + frame.alongPlusMm + 3 : posts[0].xMm - frame.alongMinusMm - 3;
  layout.sideFields = listFields(configuration).flatMap((field) => field.kind === 'side'
    ? [{ fieldId: field.id, side: field.side!, startMm: field.startMm ?? 0, outerXMm: sideOuterX(field.side!), widthMm: field.widthMm, heightMm: field.heightMm,
      topStartMm: rafterUndersideAt(configuration.productId, depth, rearHeight, frontHeight, field.startMm ?? 0),
      topEndMm: rafterUndersideAt(configuration.productId, depth, rearHeight, frontHeight, (field.startMm ?? 0) + field.widthMm) }] : []);
  return layout;
}
