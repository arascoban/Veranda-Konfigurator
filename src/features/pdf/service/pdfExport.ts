import type { QuoteResult } from '../../../domain/pricing/quote';
import { buildPdfTemplate } from '../template/pdfTemplate';
import { buildPdfDocumentSnapshot, type PdfDocumentSnapshot } from './documentSnapshot';

export type PdfSource = {
  configuration: unknown;
  revision: number;
  /** Full quote of a trusted price source. The store does not hold one yet, so callers pass null. */
  quote: { revision: number; result: QuoteResult } | null;
};

export type PdfExportResult =
  | { status: 'ready'; fileName: string; bytes: Uint8Array; revision: number; documentId: string }
  | { status: 'stale' | 'invalid_configuration' | 'error' };

export function createDraftDocumentId(now: Date, random: () => number = Math.random): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const suffix = Array.from({ length: 4 }, () => '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(random() * 32)]).join('');
  return `PE-${date}-${suffix}`;
}

/**
 * Builds the draft PDF from one revision. If the configuration changes while the document
 * is rendered, the result is discarded instead of being offered as current.
 */
export async function createPdfDraft(read: () => PdfSource, options: {
  now?: Date; documentId?: string;
  /** Renders the five product views of the snapshot (browser only). When it fails, no PDF is produced. */
  captureViews?: (configuration: PdfDocumentSnapshot['configuration']) => Promise<NonNullable<PdfDocumentSnapshot['views']>>;
} = {}): Promise<PdfExportResult> {
  const now = options.now ?? new Date();
  const source = read();
  const snapshotResult = buildPdfDocumentSnapshot({
    configuration: source.configuration, revision: source.revision, currentRevision: source.revision,
    documentId: options.documentId ?? createDraftDocumentId(now), createdAt: now, quote: source.quote,
  });
  if (snapshotResult.status === 'stale') return { status: 'stale' };
  if (snapshotResult.status !== 'ready') return { status: 'invalid_configuration' };
  const { snapshot } = snapshotResult;
  let bytes: Uint8Array;
  let fileName: string;
  try {
    if (options.captureViews) {
      snapshot.views = await options.captureViews(snapshot.configuration);
      if (read().revision !== snapshot.revision) return { status: 'stale' };
    }
    const template = buildPdfTemplate(snapshot);
    fileName = template.fileName;
    // Loaded on demand so the PDF library is not part of the first page load.
    const { renderPdfDocument } = await import('./renderPdf');
    bytes = await renderPdfDocument(template, now);
  } catch {
    return { status: 'error' };
  }
  if (read().revision !== snapshot.revision) return { status: 'stale' };
  return { status: 'ready', fileName, bytes, revision: snapshot.revision, documentId: snapshot.documentId };
}

export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
