import { describe, expect, it } from 'vitest';
import { maxPostCenterGapMm } from '../../catalog/catalog';
import { minimumPostCountForSpan, validatePostCenters } from './posts';

const posts = (...centers: number[]) => centers.map((xMm, index) => ({ id: `p${index}`, xMm }));

describe('confirmed post-center limits', () => {
  it('switches Premium from 600 cm to the Prime 400 cm gap above 600 cm width', () => {
    expect(maxPostCenterGapMm('premium', 6000)).toBe(6000);
    expect(maxPostCenterGapMm('premium', 6001)).toBe(4000);
    expect(maxPostCenterGapMm('prime', 6000)).toBe(4000);
    expect(validatePostCenters('premium', 6000, posts(0, 6000))).toEqual([]);
    expect(validatePostCenters('premium', 6001, posts(0, 6001))).toContain('center_gap_too_large');
  });

  it('needs four posts at 1000 cm even with maximum 50 cm end insets', () => {
    expect(minimumPostCountForSpan(9000, 4000)).toBe(4);
    expect(validatePostCenters('premium', 10000, posts(500, 5000, 9500))).toContain('center_gap_too_large');
    expect(validatePostCenters('premium', 10000, posts(500, 3500, 6500, 9500))).toEqual([]);
  });

  it('allows three posts at 900 cm only with suitable positions', () => {
    expect(validatePostCenters('premium', 9000, posts(500, 4500, 8500))).toEqual([]);
    expect(validatePostCenters('premium', 9000, posts(0, 4500, 9000))).toContain('center_gap_too_large');
    expect(validatePostCenters('prime', 9000, posts(501, 4500, 8500))).toContain('end_post_inset_too_large');
  });

  it('includes 50 cm end insets but rejects 50.1 cm and invalid center layouts', () => {
    expect(validatePostCenters('prime', 9000, posts(500, 4500, 8500))).toEqual([]);
    expect(validatePostCenters('prime', 9000, posts(501, 4500, 8500))).toContain('end_post_inset_too_large');
    expect(validatePostCenters('prime', 9000, posts(500, 4500, 8499))).toContain('end_post_inset_too_large');
    expect(validatePostCenters('prime', 9000, posts(-1, 4500, 8500))).toContain('post_outside_width');
    expect(validatePostCenters('prime', 9000, posts(500, 500, 8500))).toContain('not_strictly_increasing');
    expect(minimumPostCountForSpan(0, 4000)).toBeNull();
  });
});
