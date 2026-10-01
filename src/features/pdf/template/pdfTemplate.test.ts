import { describe, expect, it } from 'vitest';
import { exampleSnapshot } from './fixtures';
import { buildPdfTemplate } from './pdfTemplate';

function allText(template: ReturnType<typeof buildPdfTemplate>): string {
  return JSON.stringify(template);
}

describe('PDF template', () => {
  it('labels the draft, keeps the real measurements and never prints a zero price', () => {
    const template = buildPdfTemplate(exampleSnapshot());
    const text = allText(template);
    expect(template.documentLabel).toBe('Planungsentwurf');
    expect(template.title).toBe('Terrassenüberdachung Prime');
    expect(template.sections[0].rows.slice(0, 4).map((row) => row.value)).toEqual(['530 cm', '320 cm', '270 cm', '240 cm']);
    expect(template.price.available).toBe(false);
    expect(template.price.headline).toBe('Preis noch nicht verfügbar');
    expect(text).not.toMatch(/0,00\s?€/);
    expect(template.notes.join(' ')).toContain('Kein Angebot');
    expect(template.plan.postCentersMm).toEqual([500, 2650, 4800]);
    expect(template.sections[2].rows.find((row) => row.label.startsWith('Achsen'))?.value).toBe('50 · 265 · 480 cm');
    expect(template.meta[1].value).toBe('30.09.2026, 12:15');
    expect(template.fileName).toBe('Planungsentwurf-PE-20260930-TEST.pdf');
  });

  it('uses the roof layout of the snapshot and places supports across the full width', () => {
    const template = buildPdfTemplate(exampleSnapshot());
    // 530 cm glass: ceil((5300 − 55) / 883) = 6 bays, 7 supports.
    expect(template.sections[1].rows.find((row) => row.label === 'Dachfelder')?.value).toBe('6 (automatisch) · 7 Träger');
    expect(template.plan.roofSupportCentersMm).toHaveLength(7);
    expect(template.plan.roofSupportCentersMm[0]).toBe(27.5);
    expect(template.plan.roofSupportCentersMm[6]).toBeCloseTo(5300 - 27.5);
  });

  it('shows an approved price with scope and version', () => {
    const template = buildPdfTemplate(exampleSnapshot({
      status: 'ready', productId: 'prime', roofMaterialId: 'glass', catalogVersion: '2026-09-29-v1',
      priceVersion: 'test-only', currency: 'EUR', scopeDe: 'Nur Testumfang', validUntilIso: '2026-10-30T00:00:00Z',
      engineeringReviewRequired: true, amountMinor: 123456,
      lines: [{ id: 'base', labelDe: 'Grundpreis', quantity: 1, unitAmountMinor: 123456, currency: 'EUR', lineAmountMinor: 123456 }],
    }));
    expect(template.price.available).toBe(true);
    expect(template.price.headline.replace(/\s/g, ' ')).toBe('1.234,56 €');
    expect(template.price.details).toContain('Nur Testumfang');
    expect(template.price.lines[0].label).toBe('Grundpreis');
  });
});

describe('PDF garden-view ordering and options (ASTRA-GP-04/05)', () => {
  it('derives post axes, pitches and clear openings from one garden-view ordering', () => {
    const snapshot = exampleSnapshot();
    snapshot.configuration.postCenters = [{ id: 'a', xMm: 500 }, { id: 'b', xMm: 2000 }, { id: 'c', xMm: 4800 }];
    const rows = buildPdfTemplate(snapshot).sections.find((section) => section.heading === 'Pfosten')!.rows;
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('Achsen ab links (vom Garten)')).toBe('50 · 330 · 480 cm');
    expect(value('Achsabstände')).toBe('280 · 150 cm');
    expect(value('Lichte Weiten')).toBe('269 · 139 cm');
    expect(value('Wasserablauf')).toBe('Links (vom Garten gesehen)');
    expect(value('Pfostendeckel')).toBe('Gerade');
  });

  it('reports both drains above 800 cm and hides the cap style on Premium', () => {
    const snapshot = exampleSnapshot();
    snapshot.configuration.productId = 'premium';
    snapshot.configuration.dimensionsMm.width = 8500;
    snapshot.configuration.postCenters = [{ id: 'a', xMm: 65 }, { id: 'b', xMm: 4250 }, { id: 'c', xMm: 8435 }];
    const rows = buildPdfTemplate(snapshot).sections.find((section) => section.heading === 'Pfosten')!.rows;
    expect(rows.find((row) => row.label === 'Wasserablauf')?.value).toBe('Links und rechts (ab 800 cm Breite)');
    expect(rows.some((row) => row.label === 'Pfostendeckel')).toBe(false);
  });
});
