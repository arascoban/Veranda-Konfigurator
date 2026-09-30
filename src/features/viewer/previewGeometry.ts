import type { ConfigurationV1 } from '../../domain/configuration';
import { millimetresToMetres } from '../../domain/units';

/** Schematic preview axes: X = gutter width, Z = wall-to-front horizontal depth, Y = height. */
export type PreviewDimensions = {
  widthM: number;
  depthM: number;
  rearHeightM: number;
  frontHeightM: number;
  postCentersM: number[];
};

export function previewDimensions(configuration: ConfigurationV1): PreviewDimensions | null {
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  const dimensions = [width, depth, rearHeight, frontHeight];
  if (dimensions.some((value) => value === null || !Number.isSafeInteger(value) || value <= 0)) return null;
  if (width === null || depth === null || rearHeight === null || frontHeight === null) return null;
  const postCenters = configuration.postCenters ?? [];
  if (postCenters.some((post) => !Number.isSafeInteger(post.xMm) || post.xMm < 0 || post.xMm > width)) return null;
  return {
    widthM: millimetresToMetres(width),
    depthM: millimetresToMetres(depth),
    rearHeightM: millimetresToMetres(rearHeight),
    frontHeightM: millimetresToMetres(frontHeight),
    postCentersM: postCenters.map((post) => millimetresToMetres(post.xMm)),
  };
}

export function cameraDistanceForPreview(dimensions: PreviewDimensions, verticalFovDeg: number, aspect: number): number {
  if (!Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 180 || !Number.isFinite(aspect) || aspect <= 0) {
    throw new RangeError('Valid camera field of view and aspect ratio required');
  }
  const height = Math.max(dimensions.rearHeightM, dimensions.frontHeightM);
  const radius = Math.hypot(dimensions.widthM, dimensions.depthM, height) / 2;
  const verticalHalfAngle = verticalFovDeg * Math.PI / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
  return radius / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle)) * 1.25;
}
