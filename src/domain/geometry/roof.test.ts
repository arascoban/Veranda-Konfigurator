import { describe, expect, it } from 'vitest';
import { calculateRoofBayGeometry, minimumRoofBayCount } from './roof';

describe('confirmed equal roof bay formula', () => {
  it.each([
    [5000, 'glass', 6, 7, 80.1166666667],
    [5000, 'polycarbonate', 5, 6, 96.9],
    [12000, 'glass', 14, 15, 83.0214285714],
    [12000, 'polycarbonate', 12, 13, 97.5416666667],
  ] as const)('%i mm %s uses the smallest valid bay count', (width, material, count, supports, panelCm) => {
    expect(minimumRoofBayCount(width, material)).toBe(count);
    const roof = calculateRoofBayGeometry(width, material, count)!;
    expect(roof.valid).toBe(true);
    expect(roof.supportCount).toBe(supports);
    expect(roof.finalPanelWidthMm.numerator / roof.finalPanelWidthMm.denominator / 10).toBeCloseTo(panelCm, 8);
    expect(
      roof.intermediateCapWidthMm.numerator + 55 * supports,
    ).toBe(width);
    expect(calculateRoofBayGeometry(width, material, count - 1)?.valid).toBe(false);
  });

  it('applies limits after adding the panel allowance, without rounding', () => {
    expect(calculateRoofBayGeometry(938, 'glass', 1)?.valid).toBe(true);
    expect(calculateRoofBayGeometry(939, 'glass', 1)?.reasons).toContain('panel_too_wide');
    expect(calculateRoofBayGeometry(1055, 'polycarbonate', 1)?.valid).toBe(true);
    expect(calculateRoofBayGeometry(1056, 'polycarbonate', 1)?.reasons).toContain('panel_too_wide');
  });

  it('rejects physically non-positive intermediate caps', () => {
    expect(calculateRoofBayGeometry(1000, 'glass', 20)?.reasons).toContain('non_positive_cap');
    expect(minimumRoofBayCount(0, 'glass')).toBeNull();
    expect(minimumRoofBayCount(-100, 'glass')).toBeNull();
    expect(calculateRoofBayGeometry(5000, 'glass', 0)).toBeNull();
  });
});
