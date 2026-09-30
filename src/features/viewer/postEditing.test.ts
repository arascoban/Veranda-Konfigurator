import { describe, expect, it } from 'vitest';
import { validatePostCenters } from '../../domain/geometry/posts';
import { addPost, createMinimumPostLayout, findSelectedOpening, finishPostDrag, movePost, movePostFromCentimetres, openingAxisSpans, postMoveRange, removePost } from './postEditing';

describe('schematic post editing', () => {
  it('uses the fewest posts under the confirmed centre-gap rule', () => {
    const premium = createMinimumPostLayout('premium', 6000)!;
    const prime = createMinimumPostLayout('prime', 6000)!;
    expect(premium).toHaveLength(2);
    expect(prime).toHaveLength(3);
    expect(createMinimumPostLayout('premium', 10000)).toHaveLength(4);
    expect(validatePostCenters('premium', 10000, createMinimumPostLayout('premium', 10000)!)).toEqual([]);
  });

  it('constrains dragging and refuses a removal that would exceed the span limit', () => {
    const posts = createMinimumPostLayout('prime', 9000)!;
    expect(posts).toHaveLength(3);
    const range = postMoveRange('prime', 9000, posts, 1)!;
    expect(range.minMm).toBeGreaterThan(posts[0].xMm);
    expect(range.maxMm).toBeLessThan(posts[2].xMm);
    expect(movePost('prime', 9000, posts, 1, 9000)?.[1].xMm).toBe(range.maxMm);
    expect(removePost('prime', 9000, posts, 1)).toBeNull();
    expect(addPost('prime', 9000, posts)).toHaveLength(4);
  });

  it('derives selectable fields only from valid post axes', () => {
    const posts = createMinimumPostLayout('prime', 9000)!;
    const spans = openingAxisSpans('prime', 9000, posts);
    expect(spans).toHaveLength(posts.length - 1);
    expect(spans.reduce((total, span) => total + span.spanMm, 0)).toBe(posts.at(-1)!.xMm - posts[0].xMm);
    expect(openingAxisSpans('prime', 9000, [posts[1], posts[0], posts[2]])).toEqual([]);
  });

  it('commits a completed drag once and leaves cancellation or unchanged position uncommitted', () => {
    const posts = createMinimumPostLayout('prime', 6000)!;
    expect(finishPostDrag('prime', 6000, posts, 1, posts[1].xMm, 3500, true)).toBeNull();
    expect(finishPostDrag('prime', 6000, posts, 1, posts[1].xMm, posts[1].xMm, false)).toBeNull();
    expect(finishPostDrag('prime', 6000, posts, 1, posts[1].xMm, 3500, false)?.[1].xMm).toBe(3500);
    expect(posts[1].xMm).toBe(3000);
  });

  it('keeps the same opening selected when a post is inserted before it', () => {
    const posts = createMinimumPostLayout('prime', 6000)!;
    const selected = openingAxisSpans('prime', 6000, posts)[1];
    const updated = addPost('prime', 6000, posts)!;
    const active = findSelectedOpening(openingAxisSpans('prime', 6000, updated), selected);
    expect(active).toMatchObject({ index: 2, leftPostId: 'post-2', rightPostId: 'post-3', spanMm: 2500 });
  });

  it('clears a split opening instead of transferring selection to a new opening', () => {
    const posts = createMinimumPostLayout('prime', 6000)!;
    const selected = openingAxisSpans('prime', 6000, posts)[0];
    expect(findSelectedOpening(openingAxisSpans('prime', 6000, addPost('prime', 6000, posts)!), selected)).toBeUndefined();
    const moved = movePost('prime', 6000, posts, 1, 3500)!;
    expect(findSelectedOpening(openingAxisSpans('prime', 6000, moved), selected)?.spanMm).toBe(3000);
  });

  it('leaves empty and invalid position entries unchanged, including unsupported precision', () => {
    const posts = createMinimumPostLayout('prime', 6000)!;
    for (const raw of ['', '  ', 'abc', 'Infinity', '-1', '300.11']) {
      expect(movePostFromCentimetres('prime', 6000, posts, 1, raw)).toBeNull();
    }
    expect(posts[1].xMm).toBe(3000);
    expect(movePostFromCentimetres('prime', 6000, posts, 0, '0')?.[0].xMm).toBe(0);
    expect(movePostFromCentimetres('prime', 6000, posts, 1, '350,1')?.[1].xMm).toBe(3501);
  });
});
