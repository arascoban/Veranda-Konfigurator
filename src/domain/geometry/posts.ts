import { END_POST_MAX_INSET_MM, MIN_CLEAR_OPENING_MM, maxPostCenterGapMm, postWidthMm, type ProductId } from '../../catalog/catalog';

export type PostCenter = { id: string; xMm: number };
export type PostIssue =
  | 'too_few_posts'
  | 'duplicate_id'
  | 'not_strictly_increasing'
  | 'post_outside_width'
  | 'end_post_inset_too_large'
  | 'center_gap_too_large'
  | 'clear_opening_too_small';

/** Distance between the facing sides of two posts; centre gap minus one post width. */
export function clearOpeningMm(productId: ProductId, leftCenterMm: number, rightCenterMm: number): number {
  return rightCenterMm - leftCenterMm - postWidthMm(productId);
}

/** Centre positions at which the outer face of an end post is flush with the gutter end. */
export function flushEndPostCenters(productId: ProductId, widthMm: number): { leftMm: number; rightMm: number } {
  const half = postWidthMm(productId) / 2;
  return { leftMm: Math.ceil(half), rightMm: widthMm - Math.ceil(half) };
}

export function minimumPostCountForSpan(spanMm: number, maxGapMm: number): number | null {
  if (!Number.isSafeInteger(spanMm) || spanMm <= 0 || !Number.isSafeInteger(maxGapMm) || maxGapMm <= 0) return null;
  return Math.ceil(spanMm / maxGapMm) + 1;
}

export function validatePostCenters(productId: ProductId, widthMm: number, posts: readonly PostCenter[]): PostIssue[] {
  const issues: PostIssue[] = [];
  if (posts.length < 2) return ['too_few_posts'];
  if (new Set(posts.map((post) => post.id)).size !== posts.length) issues.push('duplicate_id');
  const maxGap = maxPostCenterGapMm(productId, widthMm);
  const half = postWidthMm(productId) / 2;
  // The whole post has to sit under the gutter: its faces, not only its centre, stay within the width.
  for (const post of posts) {
    if (!Number.isSafeInteger(post.xMm) || post.xMm - half < 0 || post.xMm + half > widthMm) issues.push('post_outside_width');
  }
  const leftInset = posts[0].xMm - half;
  const rightInset = widthMm - (posts[posts.length - 1].xMm + half);
  if (leftInset > END_POST_MAX_INSET_MM || rightInset > END_POST_MAX_INSET_MM) issues.push('end_post_inset_too_large');
  for (let index = 1; index < posts.length; index += 1) {
    const gap = posts[index].xMm - posts[index - 1].xMm;
    if (gap <= 0) issues.push('not_strictly_increasing');
    else if (clearOpeningMm(productId, posts[index - 1].xMm, posts[index].xMm) < MIN_CLEAR_OPENING_MM) issues.push('clear_opening_too_small');
    if (gap > maxGap) issues.push('center_gap_too_large');
  }
  return [...new Set(issues)];
}
