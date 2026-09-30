import { de, issueTextDe } from '../../../content/de';
import { evaluateConfiguration } from '../../../domain/evaluateConfiguration';
import { ROOF_SUPPORT_WIDTH_MM, postSections, postWidthMm } from '../../../catalog/catalog';
import type { PdfDocumentSnapshot } from '../service/documentSnapshot';

export type PdfRow = { label: string; value: string };
export type PdfSection = { heading: string; rows: PdfRow[] };

/** Plain drawing data in mm; the renderer decides the scale. Viewed from above, wall at the bottom. */
export type PdfPlanDrawing = {
  widthMm: number;
  depthMm: number;
  roofSupportCentersMm: number[];
  postCentersMm: number[];
  postSectionMm: { alongGutterMm: number; towardsGardenMm: number };
  caption: string;
};

export type PdfTemplate = {
  brand: string;
  documentLabel: string;
  title: string;
  subtitle: string;
  meta: PdfRow[];
  sections: PdfSection[];
  plan: PdfPlanDrawing;
  price: { available: boolean; headline: string; details: string[]; lines: PdfRow[] };
  notes: string[];
  footer: string;
  fileName: string;
};

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

export function formatCentimetres(valueMm: number): string {
  return `${numberDe.format(valueMm / 10)} cm`;
}

export function formatMoneyDe(amountMinor: number, currency: string): string | null {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountMinor / 100); }
  catch { return null; }
}

function formatDateDe(iso: string, withTime: boolean): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(iso));
}

const unavailableReasonDe = {
  missing: 'Für diese Planung liegt noch keine freigegebene Preisliste vor.',
  stale: 'Die Planung wurde nach der letzten Preisberechnung geändert.',
  invalid: 'Der vorhandene Preis passt nicht zu dieser Planung.',
} as const;

/**
 * Builds every visible text of the draft PDF from one immutable snapshot.
 * No value is invented: missing prices and unverified rules are stated as such.
 */
export function buildPdfTemplate(snapshot: PdfDocumentSnapshot): PdfTemplate {
  const { configuration } = snapshot;
  const { width, depth, rearHeight, frontHeight } = configuration.dimensionsMm;
  if (width === null || depth === null || rearHeight === null || frontHeight === null || configuration.postCenters === null) {
    throw new Error('PDF template requires a complete configuration snapshot');
  }
  const evaluation = evaluateConfiguration(configuration);
  const roof = evaluation.roof;
  if (!roof?.valid) throw new Error('PDF template requires a valid roof layout');

  const panelWidthMm = roof.finalPanelWidthMm.numerator / roof.finalPanelWidthMm.denominator;
  const posts = configuration.postCenters.map((post) => post.xMm);
  const gaps = posts.slice(1).map((x, index) => x - posts[index]);
  const supportPitch = (width - ROOF_SUPPORT_WIDTH_MM) / roof.bayCount;

  const price: PdfTemplate['price'] = snapshot.price.status === 'ready'
    ? priceReady(snapshot.price)
    : {
      available: false,
      headline: 'Preis noch nicht verfügbar',
      details: [unavailableReasonDe[snapshot.price.reason], 'Es wird kein Preis angegeben, bis eine gültige Preisliste vorliegt.'],
      lines: [],
    };

  // The general engineering/price note is already stated in the fixed notes below.
  const unverified = [...new Set(evaluation.issues
    .filter((issue) => issue.kind === 'unverified' && issue.code !== 'engineering_and_price_rules_incomplete')
    .map((issue) => issueTextDe[issue.code]).filter((text): text is string => Boolean(text)))];

  return {
    brand: de.brand,
    documentLabel: 'Planungsentwurf',
    title: `Terrassenüberdachung ${snapshot.productNameDe}`,
    subtitle: `Dacheindeckung: ${snapshot.roofMaterialNameDe}`,
    meta: [
      { label: 'Entwurfsnummer', value: snapshot.documentId },
      { label: 'Erstellt am', value: formatDateDe(snapshot.createdAtIso, true) },
      { label: 'Planungsstand', value: `Revision ${snapshot.revision}` },
      { label: 'Katalogstand', value: configuration.catalogVersion },
    ],
    sections: [
      {
        heading: 'Maße',
        rows: [
          { label: de.dimensions.width.label, value: formatCentimetres(width) },
          { label: de.dimensions.depth.label, value: formatCentimetres(depth) },
          { label: de.dimensions.rearHeight.label, value: formatCentimetres(rearHeight) },
          { label: de.dimensions.frontHeight.label, value: formatCentimetres(frontHeight) },
          { label: 'Dachneigung', value: 'Noch nicht bestätigt' },
        ],
      },
      {
        heading: 'Dach',
        rows: [
          { label: 'Eindeckung', value: snapshot.roofMaterialNameDe },
          { label: 'Dachfelder', value: `${roof.bayCount}${configuration.roofBayCount === null ? ' (automatisch)' : ' (gewählt)'}` },
          { label: 'Dachträger', value: String(roof.supportCount) },
          { label: 'Plattenbreite', value: `ca. ${formatCentimetres(Math.round(panelWidthMm))}` },
        ],
      },
      {
        heading: 'Stützen',
        rows: [
          { label: 'Anzahl', value: String(posts.length) },
          { label: 'Querschnitt', value: `${postSections[configuration.productId].alongGutterMm / 10} × ${postSections[configuration.productId].towardsGardenMm / 10} cm` },
          { label: 'Achsen ab links', value: posts.map((x) => numberDe.format(x / 10)).join(' · ') + ' cm' },
          { label: 'Achsabstände', value: gaps.map((gap) => numberDe.format(gap / 10)).join(' · ') + ' cm' },
          { label: 'Lichte Weiten', value: gaps.map((gap) => numberDe.format((gap - postWidthMm(configuration.productId)) / 10)).join(' · ') + ' cm' },
        ],
      },
    ],
    plan: {
      widthMm: width,
      depthMm: depth,
      roofSupportCentersMm: Array.from({ length: roof.supportCount },
        (_, index) => ROOF_SUPPORT_WIDTH_MM / 2 + index * supportPitch),
      postCentersMm: posts,
      postSectionMm: { ...postSections[configuration.productId] },
      caption: 'Schematische Draufsicht, Blick von der Hauswand. Keine Produktabbildung, nicht für die Fertigung.',
    },
    price,
    notes: [
      'Unverbindlicher Planungsentwurf. Kein Angebot und keine Auftragsbestätigung.',
      'Technische Prüfung und Fertigungsfreigabe stehen noch aus.',
      ...unverified,
    ],
    footer: `${de.brand} · Planungsentwurf ${snapshot.documentId}`,
    fileName: `Planungsentwurf-${snapshot.documentId.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
  };
}

function priceReady(price: Extract<PdfDocumentSnapshot['price'], { status: 'ready' }>): PdfTemplate['price'] {
  const total = formatMoneyDe(price.amountMinor, price.currency);
  if (total === null) {
    return { available: false, headline: 'Preis noch nicht verfügbar', details: ['Die Preisangabe konnte nicht gelesen werden.'], lines: [] };
  }
  return {
    available: true,
    headline: total,
    details: [price.scopeDe, `Preisstand ${price.priceVersion}, gültig bis ${formatDateDe(price.validUntilIso, false)}`],
    lines: price.lines.map((line) => ({
      label: line.quantity === 1 ? line.labelDe : `${line.quantity} × ${line.labelDe}`,
      value: formatMoneyDe(line.lineAmountMinor, line.currency) ?? '–',
    })),
  };
}
