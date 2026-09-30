import { createEmptyConfiguration } from '../../../domain/configuration';
import type { QuoteResult } from '../../../domain/pricing/quote';
import { buildPdfDocumentSnapshot, type PdfDocumentSnapshot } from '../service/documentSnapshot';

/** Test fixture only; the numbers are not product or price data. */
export function exampleSnapshot(quote: QuoteResult | null = null): PdfDocumentSnapshot {
  const configuration = createEmptyConfiguration();
  configuration.dimensionsMm = { width: 5300, depth: 3200, rearHeight: 2700, frontHeight: 2400 };
  configuration.postCenters = [{ id: 'l', xMm: 500 }, { id: 'm', xMm: 2650 }, { id: 'r', xMm: 4800 }];
  const result = buildPdfDocumentSnapshot({
    configuration, revision: 3, currentRevision: 3, documentId: 'PE-20260930-TEST',
    createdAt: new Date('2026-09-30T10:15:00Z'), quote: quote ? { revision: 3, result: quote } : null,
  });
  if (result.status !== 'ready') throw new Error(result.status);
  return result.snapshot;
}
