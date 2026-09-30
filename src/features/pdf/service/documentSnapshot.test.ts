import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../../../domain/configuration';
import type { QuoteResult } from '../../../domain/pricing/quote';
import { buildPdfDocumentSnapshot } from './documentSnapshot';

function exampleConfiguration() {
  const configuration = createEmptyConfiguration();
  configuration.dimensionsMm = { width: 5300, depth: 3200, rearHeight: 2700, frontHeight: 2400 };
  configuration.postCenters = [
    { id: 'left', xMm: 500 }, { id: 'middle', xMm: 2650 }, { id: 'right', xMm: 4800 },
  ];
  return configuration;
}

describe('PDF document snapshot', () => {
  it('preserves the actual design and marks an unavailable price without inventing zero', () => {
    const configuration = exampleConfiguration();
    const result = buildPdfDocumentSnapshot({
      configuration, revision: 5, currentRevision: 5,
      documentId: 'Entwurf-5', createdAt: new Date('2026-09-29T10:00:00Z'), quote: null,
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    configuration.dimensionsMm.width = 7000;
    expect(result.snapshot.configuration.dimensionsMm.width).toBe(5300);
    expect(result.snapshot.price).toEqual({ status: 'unavailable', reason: 'missing' });
    expect(result.snapshot.imageStatus).toBe('schematic_demo_only');
    expect(result.snapshot.engineeringReviewRequired).toBe(true);
  });

  it('rejects old documents and ignores a quote from another revision or product', () => {
    const configuration = exampleConfiguration();
    const quote: QuoteResult = {
      status: 'ready', productId: 'premium', roofMaterialId: 'glass',
      catalogVersion: configuration.catalogVersion, priceVersion: 'test-only', currency: 'EUR',
      scopeDe: 'Nur Test', validUntilIso: '2026-10-30T00:00:00Z',
      engineeringReviewRequired: true, lines: [], amountMinor: 12345,
    };
    const input = {
      configuration, revision: 5, currentRevision: 5, documentId: 'Entwurf-5',
      createdAt: new Date('2026-09-29T10:00:00Z'), quote: { revision: 4, result: quote },
    };
    expect(buildPdfDocumentSnapshot({ ...input, currentRevision: 6 })).toEqual({ status: 'stale' });
    const stalePrice = buildPdfDocumentSnapshot(input);
    expect(stalePrice.status).toBe('ready');
    if (stalePrice.status === 'ready') expect(stalePrice.snapshot.price).toEqual({ status: 'unavailable', reason: 'stale' });
    const wrongProduct = buildPdfDocumentSnapshot({ ...input, quote: { revision: 5, result: quote } });
    expect(wrongProduct.status).toBe('ready');
    if (wrongProduct.status === 'ready') expect(wrongProduct.snapshot.price).toEqual({ status: 'unavailable', reason: 'invalid' });
  });
});
