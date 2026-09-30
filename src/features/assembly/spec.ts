import type { ProductId } from '../../catalog/catalog';
import { attachmentReferences, type AttachmentReference } from '../../catalog/attachmentReference';
import premiumMeasured from '../../assets/manifest/premium.measured.json';
import primeMeasured from '../../assets/manifest/prime.measured.json';

/**
 * Assembly frame (millimetres): X runs left → right as seen from inside (wall towards garden),
 * Y is up from the ground, the wall face is the plane z = 0 and the garden lies at negative Z.
 *
 * Every offset below was read from the SketchUp reference assemblies (Prime500x300, Premium500x300)
 * on 30 Sep 2026 and is PROVISIONAL until the user confirms the mounting drawings (SOL-K01-001).
 */
export type PartRole = 'post' | 'gutter' | 'gutterCap' | 'wallProfile' | 'wallCap' | 'rafter' | 'cover' | 'panel';

export type MeasuredPart = {
  glb: string;
  triangles: number;
  boundsMinCm: number[];
  boundsMaxCm: number[];
};

export type ProductAssemblySpec = {
  productId: ProductId;
  /** Same provisional numbers the rule engine uses (catalog/attachmentReference). */
  attachmentOffsets: AttachmentReference;
  /** Roof support (rafter) width used by the confirmed bay formula. */
  supportWidthMm: number;
  /** Rafter cross-section height; panels sit this far below the top edge. */
  rafterHeightMm: number;
  panelBelowRafterTopMm: number;
  /** Gutter front face beyond the post's garden-facing face. */
  gutterBeyondPostMm: number;
  gutterDepthMm: number;
  wallProfileDepthMm: number;
  /** Post top above the gutter underside (post reaches into the gutter). */
  postIntoGutterMm: number;
  postSectionMm: { alongGutter: number; towardsGarden: number };
  /** Rafter underside at its garden end, relative to the post front face (z). */
  rafterFront: { zFromPostFaceMm: number };
  /** Rafter underside at its wall end, relative to the wall face (z); heights come from attachmentOffsets. */
  rafterRear: { zFromWallFaceMm: number };
  coverAtGutter: { zFromPostFaceMm: number; aboveGutterUndersideMm: number };
  coverAtWall: { zFromWallFaceMm: number; aboveWallUndersideMm: number };
  parts: Record<string, MeasuredPart>;
};

function parts(measured: { parts: Record<string, MeasuredPart> }): Record<string, MeasuredPart> {
  return measured.parts;
}

export const primeAssemblySpec: ProductAssemblySpec = {
  productId: 'prime',
  attachmentOffsets: attachmentReferences.prime,
  supportWidthMm: 55,
  rafterHeightMm: 98,
  panelBelowRafterTopMm: 11,
  gutterBeyondPostMm: 26,
  gutterDepthMm: 165,
  wallProfileDepthMm: 55,
  postIntoGutterMm: 15,
  postSectionMm: { alongGutter: 110, towardsGarden: 110 },
  rafterFront: { zFromPostFaceMm: 53 },
  rafterRear: { zFromWallFaceMm: 35 },
  coverAtGutter: { zFromPostFaceMm: 135, aboveGutterUndersideMm: 30 },
  coverAtWall: { zFromWallFaceMm: 51, aboveWallUndersideMm: 4 },
  parts: parts(primeMeasured),
};

export const premiumAssemblySpec: ProductAssemblySpec = {
  productId: 'premium',
  attachmentOffsets: attachmentReferences.premium,
  supportWidthMm: 55,
  rafterHeightMm: 118,
  panelBelowRafterTopMm: 13,
  gutterBeyondPostMm: 32,
  gutterDepthMm: 204,
  wallProfileDepthMm: 63,
  postIntoGutterMm: 16,
  postSectionMm: { alongGutter: 130, towardsGarden: 135 },
  rafterFront: { zFromPostFaceMm: 132 },
  rafterRear: { zFromWallFaceMm: 18 },
  coverAtGutter: { zFromPostFaceMm: 129, aboveGutterUndersideMm: 24 },
  coverAtWall: { zFromWallFaceMm: 7, aboveWallUndersideMm: 5 },
  parts: parts(premiumMeasured),
};

export const assemblySpecs: Record<ProductId, ProductAssemblySpec> = {
  prime: primeAssemblySpec,
  premium: premiumAssemblySpec,
};
