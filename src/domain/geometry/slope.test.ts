import { describe, expect, it } from 'vitest';
import { calculateRoofSlope } from './slope';

// Illustrative attachment fixture, not approved Prime/Premium production offsets.
const fixtureOffsets = {
  rearConnectionAboveWallUndersideMm: 120,
  frontConnectionAboveGutterUndersideMm: 80,
  horizontalRunAdjustmentMm: 50,
};

describe('roof slope requires real attachment references', () => {
  it('does not claim an angle when profile offsets are unknown', () => {
    expect(calculateRoofSlope(3000, 2400, 2200, null)).toEqual({ status: 'missing_reference' });
  });

  it.each([5, 12])('accepts the inclusive %i degree boundary with supplied references', (degrees) => {
    const rise = Math.tan(degrees * Math.PI / 180) * 3050;
    const rearUnderside = 2200 + 80 - 120 + rise;
    expect(calculateRoofSlope(3000, rearUnderside, 2200, fixtureOffsets)).toMatchObject({
      status: 'calculated', withinLimit: true,
    });
  });

  it('uses connection offsets instead of mistaking underside height difference for roof rise', () => {
    const result = calculateRoofSlope(3000, 2500, 2200, fixtureOffsets);
    expect(result.status).toBe('calculated');
    if (result.status === 'calculated') {
      expect(result.degrees).not.toBeCloseTo(Math.atan2(300, 3000) * 180 / Math.PI, 5);
    }
  });

  it('rejects a slope outside the supplied limits', () => {
    expect(calculateRoofSlope(3000, 3000, 2200, fixtureOffsets)).toMatchObject({
      status: 'calculated', withinLimit: false,
    });
  });
});
