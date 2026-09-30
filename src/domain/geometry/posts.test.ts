import { describe, expect, it } from 'vitest';
import { maxPostCenterGapMm, postWidthMm } from '../../catalog/catalog';
import { clearOpeningMm, flushEndPostCenters, minimumPostCountForSpan, validatePostCenters } from './posts';

const posts = (...centers: number[]) => centers.map((xMm, index) => ({ id: `p${index}`, xMm }));

describe('confirmed post limits (30 Sep 2026)', () => {
  it('uses the confirmed cross-sections and flush end positions', () => {
    expect(postWidthMm('prime')).toBe(110);
    expect(postWidthMm('premium')).toBe(130);
    expect(flushEndPostCenters('prime', 2000)).toEqual({ leftMm: 55, rightMm: 1945 });
    expect(flushEndPostCenters('premium', 2000)).toEqual({ leftMm: 65, rightMm: 1935 });
  });

  it('measures the clear opening between post faces, not between centres', () => {
    // User example: 200 cm, 13 cm posts flush at both ends → 174 cm clear.
    expect(clearOpeningMm('premium', 65, 1935)).toBe(1740);
    expect(validatePostCenters('premium', 2000, posts(65, 1935))).toEqual([]);
    expect(validatePostCenters('prime', 2000, posts(55, 1945))).toEqual([]);
  });

  it('rejects clear openings under 90 cm and posts that protrude past the gutter end', () => {
    // Prime 11 cm posts: centre gap 1000 → clear 890.
    expect(validatePostCenters('prime', 3000, posts(55, 1055, 2945))).toContain('clear_opening_too_small');
    expect(validatePostCenters('prime', 3000, posts(55, 1065, 2945))).toEqual([]);
    expect(validatePostCenters('prime', 3000, posts(0, 2945))).toContain('post_outside_width');
    expect(validatePostCenters('prime', 3000, posts(55, 2946))).toContain('post_outside_width');
  });

  it('switches Premium from 600 cm to the Prime 400 cm gap above 600 cm width', () => {
    expect(maxPostCenterGapMm('premium', 6000)).toBe(6000);
    expect(maxPostCenterGapMm('premium', 6001)).toBe(4000);
    expect(maxPostCenterGapMm('prime', 6000)).toBe(4000);
    expect(validatePostCenters('premium', 6000, posts(65, 5935))).toEqual([]);
    expect(validatePostCenters('premium', 6001, posts(65, 5936))).toContain('center_gap_too_large');
  });

  it('needs four posts at 1000 cm even with maximum 50 cm end insets', () => {
    expect(minimumPostCountForSpan(9000, 4000)).toBe(4);
    // Outer faces 50 cm inside → centres at 565 and 9435; the middle post cannot bridge 887 cm.
    expect(validatePostCenters('premium', 10000, posts(565, 5000, 9435))).toContain('center_gap_too_large');
    expect(validatePostCenters('premium', 10000, posts(565, 3500, 6500, 9435))).toEqual([]);
  });

  it('allows three posts at 900 cm only with suitable positions', () => {
    expect(validatePostCenters('premium', 9000, posts(565, 4500, 8435))).toEqual([]);
    expect(validatePostCenters('premium', 9000, posts(65, 4500, 8935))).toContain('center_gap_too_large');
    expect(validatePostCenters('prime', 9000, posts(556, 4500, 8445))).toContain('end_post_inset_too_large');
  });

  it('measures the 50 cm end inset from the outer post face', () => {
    // Prime: face inset 50 cm ⇔ centre at 555; 556 puts the face 50.1 cm inside.
    expect(validatePostCenters('prime', 9000, posts(555, 4500, 8445))).toEqual([]);
    expect(validatePostCenters('prime', 9000, posts(556, 4500, 8445))).toContain('end_post_inset_too_large');
    expect(validatePostCenters('prime', 9000, posts(555, 4500, 8444))).toContain('end_post_inset_too_large');
    expect(validatePostCenters('prime', 9000, posts(-1, 4500, 8445))).toContain('post_outside_width');
    expect(validatePostCenters('prime', 9000, posts(555, 555, 8445))).toContain('not_strictly_increasing');
    expect(minimumPostCountForSpan(0, 4000)).toBeNull();
  });
});
