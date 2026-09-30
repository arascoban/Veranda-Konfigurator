import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../configuration';
import { buildGridQuote } from './gridQuote';
import type { BasePriceTable } from './basePriceGrid';
import { respondToGridQuoteRequest } from '../../services/quote/quoteService';

const config = createEmptyConfiguration();
config.dimensionsMm = { width: 5300, depth: 3200, rearHeight: 2700, frontHeight: 2400 };
config.postCenters = [{ id: 'l', xMm: 500 }, { id: 'm', xMm: 2650 }, { id: 'r', xMm: 4800 }];
const now = new Date('2026-09-29T00:00:00Z');
const table: BasePriceTable = {
  productId: 'prime', roofMaterialId: 'glass', catalogVersion: config.catalogVersion,
  priceVersion: 'test-only', scopeDe: 'Testdaten', currency: 'EUR', validUntilIso: '2027-01-01T00:00:00Z',
  cells: [{ widthMm: 6000, depthMm: 3500, amountMinor: 12345 }],
};

describe('size-table quote integration', () => {
  it('carries the price cell, material and request revision without modifying actual dimensions', async () => {
    const before = structuredClone(config);
    expect(await respondToGridQuoteRequest({ configuration: config, revision: 4 }, {
      resolveTable: async () => table,
    }, now)).toMatchObject({
      status: 'result', revision: 4, result: { quote: {
        status: 'ready', productId: 'prime', roofMaterialId: 'glass', amountMinor: 12345,
        lines: [{ id: 'base', quantity: 1, priceBasis: { widthMm: 6000, depthMm: 3500 } }],
      } },
    });
    expect(config).toEqual(before);
  });

  it('keeps the base price visible but leaves a total unavailable when extra roof bays are unpriced', () => {
    const result = buildGridQuote({ ...config, roofBayCount: 7 }, table, now);
    expect(result.basePrice).toMatchObject({ status: 'base_price_available', amountMinor: 12345 });
    expect(result.quote).toEqual({ status: 'missing_data', missingLineIds: ['extra_roof_bays'] });
  });

  it('never invents a table and rejects client-supplied totals or price cells', async () => {
    const authority = { resolveTable: async () => null };
    expect(await respondToGridQuoteRequest({ configuration: config, revision: 4 }, authority, now)).toMatchObject({
      status: 'result', result: { quote: { status: 'missing_data', missingLineIds: ['price_table'] } },
    });
    expect(await respondToGridQuoteRequest({ configuration: config, revision: 4, priceBasis: { widthMm: 3000, depthMm: 2000 } }, authority, now)).toEqual({ status: 'invalid_request' });
    expect(await respondToGridQuoteRequest({ configuration: config, revision: 4, amountMinor: 1 }, authority, now)).toEqual({ status: 'invalid_request' });
  });
});
