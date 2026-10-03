import { describe, expect, it } from 'vitest';
import { checkGlassSliding, glassSlidingLayout } from './glassSlidingDoor';

describe('Glasschiebewand sizes (docs/Masse.md)', () => {
  it.each([
    // clear width mm → leaves, rail profile, glass mm
    [1200, 2, 3, 900], [1760, 2, 3, 900], [1761, 2, 3, 980], [1920, 2, 3, 980], [2020, 2, 3, 1030],
    [2021, 3, 3, 900], [2620, 3, 3, 900], [2621, 3, 3, 980], [2860, 3, 3, 980], [3040, 3, 3, 1030],
    [3041, 4, 4, 900], [3480, 4, 4, 900], [3800, 4, 4, 980], [4000, 4, 4, 1030],
    [4001, 5, 5, 900], [4340, 5, 5, 900], [4740, 5, 5, 980], [4980, 5, 5, 1030],
    [4981, 6, 6, 900], [5200, 6, 6, 900], [5680, 6, 6, 980], [5960, 6, 6, 1030],
  ])('%i mm → %i leaves on the %i-rail profile, %i mm glass', (width, leaves, rails, glass) => {
    expect(glassSlidingLayout(width)).toMatchObject({ leaves, railProfile: rails, glassWidthMm: glass });
  });

  it('keeps at least 4 cm overlap between the U profiles everywhere in the table', () => {
    for (let width = 1200; width <= 5960; width += 1) {
      expect(glassSlidingLayout(width)!.overlapMm).toBeGreaterThanOrEqual(40);
    }
    // Tightest table limit: 3 leaves of 103 cm at 304 cm → (3 × 1030 − (3040 − 40)) / 2 = 45 mm.
    expect(glassSlidingLayout(3040)!.overlapMm).toBe(45);
  });

  it('refuses fields narrower than 120 cm, wider than 596 cm or lower than 100 cm', () => {
    expect(checkGlassSliding(1199, 2200)).toEqual({ ok: false, reason: 'too_narrow' });
    expect(checkGlassSliding(5961, 2200)).toEqual({ ok: false, reason: 'too_wide' });
    expect(checkGlassSliding(2000, 999)).toEqual({ ok: false, reason: 'too_low' });
    expect(checkGlassSliding(2000, 1000).ok).toBe(true);
  });
});
