import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../configuration';
import { lookupBasePrice, selectPriceBasis, type BasePriceTable } from './basePriceGrid';

const now = new Date('2026-09-29T00:00:00Z');
const configuration = createEmptyConfiguration();
configuration.dimensionsMm = { width: 5300, depth: 3200, rearHeight: 2700, frontHeight: 2400 };
// Synthetic prices remain in tests only; they are not a customer tariff.
const table: BasePriceTable = {
  productId: 'prime', roofMaterialId: 'glass', catalogVersion: configuration.catalogVersion,
  priceVersion: 'test-grid', currency: 'EUR', scopeDe: 'Testdaten', validUntilIso: '2027-01-01T00:00:00Z',
  cells: [{ widthMm: 3000, depthMm: 2000, amountMinor: 10000 }, { widthMm: 6000, depthMm: 3500, amountMinor: 20000 }],
};

describe('confirmed width/depth price brackets', () => {
  it.each([
    [5300, 3200, 6000, 3500],
    [3000, 2000, 3000, 2000],
    [2999, 1999, 3000, 2000],
    [2500, 3200, 3000, 3500],
    [5300, 1500, 6000, 2000],
    [6000, 3500, 6000, 3500],
    [6001, 3501, 7000, 4000],
    [12000, 5000, 12000, 5000],
  ])('%i × %i mm uses %i × %i mm pricing', (width, depth, priceWidth, priceDepth) => {
    expect(selectPriceBasis(width, depth)).toEqual({ widthMm: priceWidth, depthMm: priceDepth });
  });

  it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid dimensions (%s) instead of assigning minimum pricing', (value) => {
    expect(selectPriceBasis(value, 3200)).toBeNull();
    expect(selectPriceBasis(5300, value)).toBeNull();
  });

  it('looks up exactly the chosen base cell without changing the design', () => {
    const before = structuredClone(configuration);
    expect(lookupBasePrice(configuration, table, now)).toMatchObject({
      status: 'base_price_available', basis: { widthMm: 6000, depthMm: 3500 }, amountMinor: 20000,
    });
    expect(configuration).toEqual(before);
  });

  it('keeps absent prices missing; it never substitutes a neighbouring cell', () => {
    expect(lookupBasePrice(configuration, null, now)).toMatchObject({ status: 'missing_data', reason: 'price_table' });
    expect(lookupBasePrice(configuration, { ...table, cells: table.cells.slice(0, 1) }, now)).toMatchObject({
      status: 'missing_data', reason: 'price_cell',
    });
  });

  it('rejects another product/material and ambiguous or expired tables', () => {
    expect(lookupBasePrice(configuration, { ...table, productId: 'premium' }, now)).toMatchObject({ status: 'invalid_table' });
    expect(lookupBasePrice(configuration, { ...table, roofMaterialId: 'polycarbonate' }, now)).toMatchObject({ status: 'invalid_table' });
    expect(lookupBasePrice(configuration, { ...table, cells: [...table.cells, table.cells[1]] }, now)).toMatchObject({
      status: 'invalid_table', reason: 'cells',
    });
    expect(lookupBasePrice(configuration, { ...table, validUntilIso: now.toISOString() }, now)).toMatchObject({
      status: 'missing_data', reason: 'expired_table',
    });
  });

  it('does not convert the minimum-price bracket into a physical minimum or bypass product maxima', () => {
    const small = { ...configuration, dimensionsMm: { ...configuration.dimensionsMm, width: 2500, depth: 1500 } };
    expect(lookupBasePrice(small, table, now)).toMatchObject({ status: 'base_price_available', amountMinor: 10000 });
    const tooDeep = { ...configuration, dimensionsMm: { ...configuration.dimensionsMm, depth: 4001 } };
    expect(lookupBasePrice(tooDeep, table, now)).toEqual({ status: 'invalid_dimensions' });
    expect(lookupBasePrice({ ...tooDeep, roofMaterialId: 'polycarbonate' }, null, now)).toMatchObject({
      status: 'missing_data', basis: { widthMm: 6000, depthMm: 4500 },
    });
    expect(lookupBasePrice({ ...configuration, dimensionsMm: { ...configuration.dimensionsMm, width: 12001 } }, null, now)).toEqual({ status: 'invalid_dimensions' });
  });
});
