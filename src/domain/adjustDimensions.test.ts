import { describe, expect, it } from 'vitest';
import { attachmentReferences } from '../catalog/attachmentReference';
import { createDefaultConfiguration } from './configuration';
import { currentSlopeDegrees, dimensionRange, withDimension, withProduct } from './adjustDimensions';
import { calculateRoofSlope, rearHeightForSlope, rearHeightRange } from './geometry/slope';

describe('dimension adjustments (30 Sep 2026 rules)', () => {
  it('starts a new draft at 500 × 300 cm, front 230 cm and 8°', () => {
    const configuration = createDefaultConfiguration();
    expect(configuration.dimensionsMm.width).toBe(5000);
    expect(configuration.dimensionsMm.depth).toBe(3000);
    expect(configuration.dimensionsMm.frontHeight).toBe(2300);
    expect(currentSlopeDegrees(configuration)).toBeCloseTo(8, 1);
    expect(configuration.postCenters).toHaveLength(3);
  });

  it('keeps the slope when the front height or depth changes', () => {
    const start = createDefaultConfiguration();
    const taller = withDimension(start, 'frontHeight', 2600)!;
    expect(taller.dimensionsMm.frontHeight).toBe(2600);
    expect(currentSlopeDegrees(taller)).toBeCloseTo(8, 1);
    const deeper = withDimension(taller, 'depth', 3500)!;
    expect(currentSlopeDegrees(deeper)).toBeCloseTo(8, 1);
    expect(deeper.dimensionsMm.rearHeight).toBeGreaterThan(taller.dimensionsMm.rearHeight!);
  });

  it('changes the slope only through the rear height and then keeps the new slope', () => {
    const start = createDefaultConfiguration();
    const range = dimensionRange(start, 'rearHeight')!;
    const steeper = withDimension(start, 'rearHeight', range.maxMm)!;
    expect(currentSlopeDegrees(steeper)).toBeCloseTo(12, 1);
    const moved = withDimension(steeper, 'frontHeight', 2000)!;
    expect(currentSlopeDegrees(moved)).toBeCloseTo(12, 1);
  });

  it('rejects entries outside the live limits instead of clamping them', () => {
    const start = createDefaultConfiguration();
    const range = dimensionRange(start, 'rearHeight')!;
    expect(withDimension(start, 'rearHeight', range.maxMm + 1)).toBeNull();
    expect(withDimension(start, 'rearHeight', range.minMm - 1)).toBeNull();
    expect(withDimension(start, 'frontHeight', 499)).toBeNull();
    expect(withDimension(start, 'frontHeight', 5001)).toBeNull();
    expect(withDimension(start, 'width', 1999)).toBeNull();
    expect(withDimension(start, 'depth', 4001)).toBeNull(); // glass
  });

  it('derives the rear-height limits from 5° and 12°', () => {
    const offsets = attachmentReferences.prime;
    const range = rearHeightRange(3000, 2300, offsets)!;
    expect(calculateRoofSlope(3000, range.minMm, 2300, offsets)).toMatchObject({ status: 'calculated', withinLimit: true });
    expect(calculateRoofSlope(3000, range.maxMm, 2300, offsets)).toMatchObject({ status: 'calculated', withinLimit: true });
    expect(calculateRoofSlope(3000, range.maxMm + 1, 2300, offsets)).toMatchObject({ withinLimit: false });
    expect(rearHeightForSlope(3000, 2300, 8, offsets)).toBe(Math.round(2300 + 31 + Math.tan(8 * Math.PI / 180) * 2912 - 8));
  });

  it('keeps the slope across a product change', () => {
    const premium = withProduct(createDefaultConfiguration(), 'premium');
    expect(premium.productId).toBe('premium');
    expect(currentSlopeDegrees(premium)).toBeCloseTo(8, 1);
  });
});
