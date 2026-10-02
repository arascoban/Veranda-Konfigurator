import type { QuoteState } from '../../../state/configuratorStore';

/**
 * Test download without e-mail (ASTRA-GP-12): on in development or with VITE_PDF_TEST_DOWNLOAD=1. The customer
 * e-mail flow (GP-10/11) is not built yet, so the production button still downloads the same document.
 */
const PDF_TEST_DOWNLOAD = import.meta.env.DEV || import.meta.env.VITE_PDF_TEST_DOWNLOAD === '1';

/** "Ihre Planung" card at the bottom right of the 3D view (V2). AR moved to its own button on the view. */
export function QuoteSummary({ quote, revision, productName, materialName, measurements, onOverview, onPdf, pdfState = 'unavailable' }: {
  quote: QuoteState; revision: number; productName: string; materialName: string; measurements: string;
  onOverview?: () => void; onPdf?: () => void;
  pdfState?: 'unavailable' | 'ready' | 'working' | 'error';
}) {
  const quoteIsCurrent = 'revision' in quote && quote.revision === revision;
  const price = !quoteIsCurrent || quote.status === 'missing_data' ? { tone: 'warning', text: 'Preis noch nicht verfügbar' }
    : quote.status === 'loading' ? { tone: 'pending', text: 'Preis wird berechnet …' }
      : quote.status === 'error' ? { tone: 'error', text: 'Preis konnte nicht geladen werden' }
        : { tone: 'success', text: `${formatMoney(quote.amountMinor, quote.currency)} · Preisstand ${quote.priceVersion}` };
  const pdfText = pdfState === 'ready' ? 'PDF-Entwurf erstellen' : pdfState === 'working' ? 'PDF wird erstellt …'
    : pdfState === 'error' ? 'PDF konnte nicht erstellt werden' : 'PDF verfügbar, sobald alle Maße und Pfosten gültig sind';
  return (
    <section className="v2-quote" aria-label="Ihre Planung">
      <div className="v2-quote__top"><h2>Ihre Planung</h2><span>{productName} · {materialName}</span></div>
      <div className="v2-quote__main">
        <strong>{measurements || 'Maße noch nicht vollständig'}</strong>
        <span className={`v2-quote__price v2-quote__price--${price.tone}`}>{price.text}</span>
      </div>
      <div className="v2-quote__actions">
        <button type="button" className="v2-primary-button" onClick={onOverview} disabled={!onOverview}>Übersicht</button>
        <button type="button" className="v2-secondary-button" onClick={onPdf} disabled={!onPdf || pdfState !== 'ready'} aria-label={pdfText}
          title={PDF_TEST_DOWNLOAD ? 'Test-PDF herunterladen (ohne E-Mail)' : pdfText}>{PDF_TEST_DOWNLOAD ? 'Test-PDF' : 'PDF'}</button>
      </div>
    </section>
  );
}

function formatMoney(amountMinor: number, currency: string): string {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountMinor / 100); }
  catch { return 'Preisangabe nicht verfügbar'; }
}
