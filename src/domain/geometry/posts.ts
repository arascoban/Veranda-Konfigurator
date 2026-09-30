import { END_POST_MAX_INSET_MM, maxPostCenterGapMm, type ProductId } from '../../catalog/catalog';

export type PostCenter = { id: string; xMm: number };
export type PostIssue =
  | 'too_few_posts'
  | 'duplicate_id'
  | 'not_strictly_increasing'
  | 'post_outside_width'
  | 'end_post_inset_too_large'
  | 'center_gap_too_large';

export function minimumPostCountForSpan(spanMm: number, maxGapMm: number): number | null {
  if (!Number.isSafeInteger(spanMm) || spanMm <= 0 || !Number.isSafeInteger(maxGapMm) || maxGapMm <= 0) return null;
  return Math.ceil(spanMm / maxGapMm) + 1;
}

export function validatePostCenters(productId: ProductId, widthMm: number, posts: readonly PostCenter[]): PostIssue[] {
  const issues: PostIssue[] = [];
  if (posts.length < 2) return ['too_few_posts'];
  if (new Set(posts.map((post) => post.id)).size !== posts.length) issues.push('duplicate_id');
  const maxGap = maxPostCenterGapMm(productId, widthMm);
  for (const post of posts) {
    if (!Number.isSafeInteger(post.xMm) || post.xMm < 0 || post.xMm > widthMm) issues.push('post_outside_width');
  }
  if (posts[0].xMm > END_POST_MAX_INSET_MM || widthMm - posts[posts.length - 1].xMm > END_POST_MAX_INSET_MM) {
    issues.push('end_post_inset_too_large');
  }
  for (let index = 1; index < posts.length; index += 1) {
    const gap = posts[index].xMm - posts[index - 1].xMm;
    if (gap <= 0) issues.push('not_strictly_increasing');
    if (gap > maxGap) issues.push('center_gap_too_large');
  }
  return [...new Set(issues)];
}
