import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../../../domain/configuration';
import { createDraftDocumentId, createPdfDraft, type PdfSource } from './pdfExport';

function completeConfiguration() {
  const configuration = createEmptyConfiguration();
  configuration.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
  configuration.postCenters = [{ id: 'l', xMm: 300 }, { id: 'r', xMm: 4700 }];
  configuration.productId = 'premium';
  return configuration;
}

describe('PDF export', () => {
  it('creates a PDF for the current revision', async () => {
    const source: PdfSource = { configuration: completeConfiguration(), revision: 4, quote: null };
    const result = await createPdfDraft(() => source, { now: new Date('2026-09-30T08:00:00Z'), documentId: 'PE-1' });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.revision).toBe(4);
    expect(result.fileName).toBe('Planungsentwurf-PE-1.pdf');
    expect(new TextDecoder().decode(result.bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('discards the document when the configuration changes during rendering', async () => {
    let revision = 4;
    const read = (): PdfSource => ({ configuration: completeConfiguration(), revision: revision++, quote: null });
    expect(await createPdfDraft(read)).toEqual({ status: 'stale' });
  });

  it('refuses incomplete configurations', async () => {
    const configuration = completeConfiguration();
    configuration.postCenters = null;
    expect(await createPdfDraft(() => ({ configuration, revision: 1, quote: null }))).toEqual({ status: 'invalid_configuration' });
  });

  it('builds readable draft numbers without ambiguous characters', () => {
    expect(createDraftDocumentId(new Date(2026, 8, 30), () => 0)).toBe('PE-20260930-2222');
  });
});
