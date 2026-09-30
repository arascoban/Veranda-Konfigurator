import type { ProductId } from './catalog';

/** Offsets from the user's four measurements to the rafter contact points (see domain/geometry/slope). */
export type AttachmentReference = {
  rearConnectionAboveWallUndersideMm: number;
  frontConnectionAboveGutterUndersideMm: number;
  horizontalRunAdjustmentMm: number;
  /** false: read from the SketchUp reference assembly on 30 Sep 2026, not yet confirmed by the user. */
  confirmed: boolean;
  source: string;
};

/**
 * Prime500x300: rafter underside 31 mm above the gutter underside, 53 mm behind the post face;
 * 8 mm above the wall-profile underside, 35 mm in front of the wall face (run = depth − 88 mm).
 * Premium500x300: 25 mm / 132 mm at the gutter, 13 mm / 18 mm at the wall (run = depth − 150 mm).
 */
export const attachmentReferences: Record<ProductId, AttachmentReference> = {
  prime: {
    rearConnectionAboveWallUndersideMm: 8, frontConnectionAboveGutterUndersideMm: 31, horizontalRunAdjustmentMm: -88,
    confirmed: false, source: 'Prime500x300.fbx, 30 Sep 2026',
  },
  premium: {
    rearConnectionAboveWallUndersideMm: 13, frontConnectionAboveGutterUndersideMm: 25, horizontalRunAdjustmentMm: -150,
    confirmed: false, source: 'Premium500x300.fbx, 30 Sep 2026',
  },
};
