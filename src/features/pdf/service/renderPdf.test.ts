import { PDFDocument, PageSizes, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildPdfTemplate } from '../template/pdfTemplate';
import { exampleSnapshot } from '../template/fixtures';
import { renderPdfDocument, wrapText } from './renderPdf';

describe('PDF rendering', () => {
  it('produces a readable one-page A4 document with German characters', async () => {
    const template = buildPdfTemplate(exampleSnapshot());
    const bytes = await renderPdfDocument(template, new Date('2026-09-30T10:15:00Z'));
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThanOrEqual(1);
    const [width, height] = PageSizes.A4;
    expect(loaded.getPage(0).getSize()).toEqual({ width, height });
    expect(loaded.getTitle()).toBe('Planungsentwurf Terrassenüberdachung Prime');
  });

  it('continues on another page instead of cutting off long content', async () => {
    const template = buildPdfTemplate(exampleSnapshot());
    template.notes = Array.from({ length: 80 }, (_, index) => `Hinweis ${index + 1}: Prüfung der Maße und Übergänge.`);
    const loaded = await PDFDocument.load(await renderPdfDocument(template, new Date('2026-09-30T10:15:00Z')));
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });

  it('wraps text within the given width, including very long words', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const lines = wrapText('Kurz ' + 'X'.repeat(200), font, 10, 120);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(120);
  });
});
