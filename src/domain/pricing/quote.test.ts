import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../configuration';
import { buildQuoteFromApprovedPrices, type ApprovedPriceLine, type ApprovedPriceSheet } from './quote';
import { respondToQuoteRequest } from '../../services/quote/quoteService';

const configuration = createEmptyConfiguration();
configuration.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
configuration.postCenters = [{ id: 'left', xMm: 500 }, { id: 'right', xMm: 4500 }];

const sheet: ApprovedPriceSheet = {
  productId: 'prime', roofMaterialId: 'glass', catalogVersion: configuration.catalogVersion, priceVersion: 'test-only-v1',
  currency: 'EUR', scopeDe: 'Nur kontrollierter Test', validUntilIso: '2030-01-01T00:00:00.000Z',
  requiredLineIds: ['base', 'support'],
};
const lines: ApprovedPriceLine[] = [
  { id: 'base', labelDe: 'Testsockel', quantity: 1, unitAmountMinor: 10001, currency: 'EUR' },
  { id: 'support', labelDe: 'Testträger', quantity: 3, unitAmountMinor: 499, currency: 'EUR' },
];

describe('controlled quote arithmetic without a production tariff', () => {
  it('sums integer cents exactly and carries product, catalogue, scope and validity', () => {
    expect(buildQuoteFromApprovedPrices(configuration, sheet, lines, new Date('2029-01-01'))).toMatchObject({
      status: 'ready', productId: 'prime', priceVersion: 'test-only-v1', currency: 'EUR',
      scopeDe: 'Nur kontrollierter Test', amountMinor: 11498, engineeringReviewRequired: true,
      lines: [{ lineAmountMinor: 10001 }, { lineAmountMinor: 1497 }],
    });
  });

  it('never treats absent prices as zero and rejects mixed currencies or fractional cents', () => {
    expect(buildQuoteFromApprovedPrices(createEmptyConfiguration(), sheet, lines, new Date('2029-01-01'))).toMatchObject({
      status: 'missing_data', missingFields: ['dimensionsMm.width', 'dimensionsMm.depth', 'dimensionsMm.rearHeight', 'dimensionsMm.frontHeight'],
    });
    expect(buildQuoteFromApprovedPrices(configuration, null, [], new Date('2029-01-01'))).toEqual({
      status: 'missing_data', missingLineIds: ['approved_price_sheet'],
    });
    expect(buildQuoteFromApprovedPrices(configuration, sheet, lines.slice(0, 1), new Date('2029-01-01'))).toEqual({
      status: 'missing_data', missingLineIds: ['support'],
    });
    expect(buildQuoteFromApprovedPrices(configuration, sheet, [{ ...lines[0], currency: 'USD' }, lines[1]], new Date('2029-01-01'))).toMatchObject({
      status: 'invalid_price_data', reason: 'invalid_line_amount_or_currency',
    });
    expect(buildQuoteFromApprovedPrices(configuration, sheet, [{ ...lines[0], unitAmountMinor: 0.5 }, lines[1]], new Date('2029-01-01'))).toMatchObject({
      status: 'invalid_price_data', reason: 'invalid_line_amount_or_currency',
    });
  });

  it('rejects a Premium design against a Prime sheet and an expired sheet', () => {
    const premium = { ...configuration, productId: 'premium' as const };
    expect(buildQuoteFromApprovedPrices(premium, sheet, lines, new Date('2029-01-01'))).toMatchObject({
      status: 'invalid_price_data', reason: 'wrong_product_material_or_catalog',
    });
    expect(buildQuoteFromApprovedPrices({ ...configuration, roofMaterialId: 'polycarbonate', roofFinish: 'pc_klar' }, sheet, lines, new Date('2029-01-01'))).toMatchObject({
      status: 'invalid_price_data', reason: 'wrong_product_material_or_catalog',
    });
    expect(buildQuoteFromApprovedPrices(configuration, sheet, lines, new Date('2030-01-01'))).toEqual({
      status: 'missing_data', missingLineIds: ['current_price_sheet'],
    });
  });

  it('rejects a customer total in the request before consulting prices', async () => {
    let called = false;
    const authority = { resolve: async () => { called = true; return { sheet, lines }; } };
    expect(await respondToQuoteRequest({ configuration, revision: 2, amountMinor: 1 }, authority)).toEqual({ status: 'invalid_request' });
    expect(called).toBe(false);
    expect(await respondToQuoteRequest({ configuration, revision: 2 }, authority, new Date('2029-01-01'))).toMatchObject({
      status: 'result', revision: 2, quote: { status: 'ready', amountMinor: 11498 },
    });
  });
});
