import type { QuoteState } from '../../../state/configuratorStore';
import { Button } from '../../../ui/Button';
import { StatusMessage } from '../../../ui/StatusMessage';

/**
 * Test download without e-mail (ASTRA-GP-12): on in development or with VITE_PDF_TEST_DOWNLOAD=1. The customer
 * e-mail flow (GP-10/11) is not built yet, so the production button still downloads the same document.
 */
const PDF_TEST_DOWNLOAD = import.meta.env.DEV || import.meta.env.VITE_PDF_TEST_DOWNLOAD === '1';

export function QuoteSummary({ quote, revision, productName, materialName, measurements, onOverview, onPdf, onAr,
  pdfState = 'unavailable', arState = 'unavailable' }: {
  quote: QuoteState; revision: number; productName: string; materialName: string; measurements: string;
  onOverview?: () => void; onPdf?: () => void; onAr?: () => void;
  pdfState?: 'unavailable' | 'ready' | 'working' | 'error';
  arState?: 'unavailable' | 'ready' | 'working' | 'error';
}) {
  const quoteIsCurrent = 'revision' in quote && quote.revision === revision;
  const price = !quoteIsCurrent || quote.status === 'missing_data'
    ? { tone: 'warning' as const, title: 'Preis noch nicht verfügbar', text: 'Die Preisliste fehlt oder Angaben stehen noch aus.' }
    : quote.status === 'loading'
      ? { tone: 'pending' as const, title: 'Preis wird berechnet', text: 'Ihre Planung bleibt dabei erhalten.' }
      : quote.status === 'error'
        ? { tone: 'error' as const, title: 'Preis konnte nicht geladen werden', text: 'Bitte versuchen Sie es später erneut.' }
        : { tone: 'success' as const, title: formatMoney(quote.amountMinor, quote.currency), text: 'Preisstand ' + quote.priceVersion };
  const pdfText = pdfState === 'ready' ? 'PDF-Entwurf erstellen' : pdfState === 'working' ? 'PDF wird erstellt …'
    : pdfState === 'error' ? 'PDF konnte nicht erstellt werden' : 'PDF verfügbar, sobald alle Maße und Stützen gültig sind';
  const arText = arState === 'ready' ? 'Im Garten ansehen' : arState === 'working' ? 'AR wird vorbereitet …'
    : arState === 'error' ? 'AR-Vorschau fehlgeschlagen' : 'AR-Vorschau noch nicht verfügbar';
  return (
    <section className="quote-card" aria-label="Preis und Ausgabe">
      <div className="quote-card__top"><h2 className="quote-card__title">Ihre Planung</h2><span className="quote-card__product">{productName} · {materialName}</span></div>
      <p className="quote-card__price">{measurements || 'Maße noch nicht vollständig'}</p>
      <StatusMessage className="quote-card__status" tone={price.tone} title={price.title}>{price.text}</StatusMessage>
      <div className="quote-card__actions">
        <Button variant="primary" onClick={onOverview} disabled={!onOverview}>Übersicht</Button>
        <Button className="quote-pdf-button" onClick={onPdf} disabled={!onPdf || pdfState !== 'ready'} aria-label={pdfText} title={PDF_TEST_DOWNLOAD ? 'Test-PDF herunterladen (ohne E-Mail)' : pdfText}>
          {PDF_TEST_DOWNLOAD ? 'Test-PDF' : 'PDF'}</Button>
        <Button onClick={onAr} disabled={!onAr || arState !== 'ready'} aria-label={arText}>AR</Button>
      </div>
      {(pdfState === 'unavailable' || arState === 'unavailable') &&
        <p className="quote-card__note">{pdfState === 'unavailable' ? pdfText : arText}</p>}
    </section>
  );
}

function formatMoney(amountMinor: number, currency: string): string {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountMinor / 100); }
  catch { return 'Preisangabe nicht verfügbar'; }
}
