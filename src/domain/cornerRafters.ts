import { postWidthMm, ROOF_SUPPORT_WIDTH_MM } from '../catalog/catalog';
import type { ConfigurationV1 } from './configuration';
import { validatePostCenters } from './geometry/posts';
import { MIN_CORNER_CAP_MM } from './geometry/roof';
import { sideLayoutOf, sideOfField } from './fieldEquipment';

/**
 * Owner rule (3 Oct 2026): when an end post is moved inwards and its side carries Ausstattung, the corner rafter
 * follows the post by the same amount. The rafter at the gutter end stays, one more stands over the post, so only
 * the outer roof bay becomes narrow; the rest stays equal. Returns the pitch (gutter end → post outer face, mm) per
 * side as seen from the garden, or null when no side needs it.
 */
export function cornerRafterPitches(configuration: ConfigurationV1): { leftMm?: number; rightMm?: number } | null {
  const width = configuration.dimensionsMm.width;
  const posts = configuration.postCenters;
  if (width === null || !posts || posts.length < 2 || validatePostCenters(configuration.productId, width, posts).length) return null;
  const half = postWidthMm(configuration.productId) / 2;
  const equipped = (side: 'left' | 'right') => sideLayoutOf(configuration, side).gable !== null || configuration.fieldEquipment
    .some((entry) => sideOfField(entry.fieldId) === side && entry.elements.length > 0);
  // Garden-right is the inside x = 0 end, garden-left the x = W end.
  const rightInset = posts[0].xMm - half;
  const leftInset = width - (posts[posts.length - 1].xMm + half);
  const minimum = ROOF_SUPPORT_WIDTH_MM + MIN_CORNER_CAP_MM;
  const result: { leftMm?: number; rightMm?: number } = {};
  if (equipped('right') && rightInset >= minimum) result.rightMm = Math.round(rightInset);
  if (equipped('left') && leftInset >= minimum) result.leftMm = Math.round(leftInset);
  return result.leftMm || result.rightMm ? result : null;
}
