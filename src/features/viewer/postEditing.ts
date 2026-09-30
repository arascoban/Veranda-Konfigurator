import { END_POST_MAX_INSET_MM, MAX_WIDTH_MM, MIN_CLEAR_OPENING_MM, maxPostCenterGapMm, postWidthMm, type ProductId } from '../../catalog/catalog';
import { clearOpeningMm, flushEndPostCenters, validatePostCenters, type PostCenter } from '../../domain/geometry/posts';

export type OpeningAxisSpan = {
  index: number; leftPostId: string; rightPostId: string;
  /** Centre-to-centre distance. */
  spanMm: number;
  /** Face-to-face distance between the two posts; sliding-glass allowances are not deducted. */
  clearMm: number;
};
export type OpeningSelection = Pick<OpeningAxisSpan, 'leftPostId' | 'rightPostId'>;

/** Inserting another post must not move the selection to a different pair of posts. */
export function findSelectedOpening(spans: readonly OpeningAxisSpan[], selection: OpeningSelection | null): OpeningAxisSpan | undefined {
  return selection ? spans.find((span) => span.leftPostId === selection.leftPostId && span.rightPostId === selection.rightPostId) : undefined;
}

/** Axis spans and clear openings between posts; mounting allowances of infill products are not deducted. */
export function openingAxisSpans(productId: ProductId, widthMm: number, posts: readonly PostCenter[]): OpeningAxisSpan[] {
  if (validatePostCenters(productId, widthMm, posts).length) return [];
  return posts.slice(1).map((post, offset) => ({
    index: offset,
    leftPostId: posts[offset].id,
    rightPostId: post.id,
    spanMm: post.xMm - posts[offset].xMm,
    clearMm: clearOpeningMm(productId, posts[offset].xMm, post.xMm),
  }));
}

/** Default layout: end posts flush with the gutter ends, then the fewest posts under the centre-gap rule. */
export function createMinimumPostLayout(productId: ProductId, widthMm: number): PostCenter[] | null {
  if (!Number.isSafeInteger(widthMm) || widthMm <= 0 || widthMm > MAX_WIDTH_MM) return null;
  const { leftMm: left, rightMm: right } = flushEndPostCenters(productId, widthMm);
  const maxGap = maxPostCenterGapMm(productId, widthMm);
  const gaps = Math.max(1, Math.ceil((right - left) / maxGap));
  const posts = Array.from({ length: gaps + 1 }, (_, index) => ({
    id: `post-${index + 1}`,
    xMm: Math.round(left + ((right - left) * index) / gaps),
  }));
  return validatePostCenters(productId, widthMm, posts).length === 0 ? posts : null;
}

/** Limits preserve the confirmed end-inset and centre-gap rules while one post moves. */
export function postMoveRange(productId: ProductId, widthMm: number, posts: readonly PostCenter[], index: number): {
  minMm: number; maxMm: number;
} | null {
  if (!Number.isSafeInteger(widthMm) || widthMm <= 0 || index < 0 || index >= posts.length || posts.length < 2) return null;
  const maxGap = maxPostCenterGapMm(productId, widthMm);
  const minCenterGap = postWidthMm(productId) + MIN_CLEAR_OPENING_MM;
  const flush = flushEndPostCenters(productId, widthMm);
  const previous = posts[index - 1];
  const next = posts[index + 1];
  let minMm = index === 0 ? flush.leftMm : previous.xMm + minCenterGap;
  let maxMm = index === posts.length - 1 ? flush.rightMm : next.xMm - minCenterGap;
  if (index === 0) maxMm = Math.min(maxMm, flush.leftMm + END_POST_MAX_INSET_MM);
  if (index === posts.length - 1) minMm = Math.max(minMm, flush.rightMm - END_POST_MAX_INSET_MM);
  if (previous) maxMm = Math.min(maxMm, previous.xMm + maxGap);
  if (next) minMm = Math.max(minMm, next.xMm - maxGap);
  return minMm <= maxMm ? { minMm, maxMm } : null;
}

export function movePost(productId: ProductId, widthMm: number, posts: readonly PostCenter[], index: number, xMm: number): PostCenter[] | null {
  const range = postMoveRange(productId, widthMm, posts, index);
  if (!range || !Number.isSafeInteger(xMm)) return null;
  const next = posts.map((post, postIndex) => postIndex === index
    ? { ...post, xMm: Math.max(range.minMm, Math.min(range.maxMm, xMm)) }
    : { ...post });
  return validatePostCenters(productId, widthMm, next).length === 0 ? next : null;
}

/** Empty/invalid input leaves the current position intact; explicit zero remains valid. */
export function movePostFromCentimetres(productId: ProductId, widthMm: number, posts: readonly PostCenter[], index: number, raw: string): PostCenter[] | null {
  const value = raw.trim();
  if (!/^\d+(?:[.,]\d)?$/.test(value)) return null;
  const [whole, tenth = '0'] = value.split(/[.,]/);
  const xMm = Number(whole) * 10 + Number(tenth);
  return movePost(productId, widthMm, posts, index, xMm);
}

/** A cancelled gesture never produces a configuration revision. */
export function finishPostDrag(productId: ProductId, widthMm: number, posts: readonly PostCenter[], index: number,
  initialMm: number, currentMm: number, cancelled: boolean): PostCenter[] | null {
  if (cancelled || currentMm === initialMm) return null;
  return movePost(productId, widthMm, posts, index, currentMm);
}

export function addPost(productId: ProductId, widthMm: number, posts: readonly PostCenter[]): PostCenter[] | null {
  if (validatePostCenters(productId, widthMm, posts).length) return null;
  let gapIndex = -1;
  let largestGap = 1;
  for (let index = 0; index < posts.length - 1; index += 1) {
    const gap = posts[index + 1].xMm - posts[index].xMm;
    if (gap > largestGap) { largestGap = gap; gapIndex = index; }
  }
  if (gapIndex < 0) return null;
  const used = new Set(posts.map((post) => post.id));
  let serial = 1;
  while (used.has(`post-${serial}`)) serial += 1;
  const next = posts.map((post) => ({ ...post }));
  next.splice(gapIndex + 1, 0, { id: `post-${serial}`, xMm: Math.round((posts[gapIndex].xMm + posts[gapIndex + 1].xMm) / 2) });
  return validatePostCenters(productId, widthMm, next).length === 0 ? next : null;
}

export function removePost(productId: ProductId, widthMm: number, posts: readonly PostCenter[], index: number): PostCenter[] | null {
  if (posts.length <= 2 || index < 0 || index >= posts.length) return null;
  const next = posts.filter((_, postIndex) => postIndex !== index).map((post) => ({ ...post }));
  return validatePostCenters(productId, widthMm, next).length === 0 ? next : null;
}
