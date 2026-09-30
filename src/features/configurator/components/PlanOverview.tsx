import { roofMaterials } from '../../../catalog/catalog';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { QuoteState } from '../../../state/configuratorStore';
import { de } from '../../../content/de';
import { Button } from '../../../ui/Button';
import { StatusMessage } from '../../../ui/StatusMessage';
import { Modal } from '../../../ui/Modal';

export function PlanOverview({ open, onClose, configuration, quote, revision, onPdf, pdfReady = false, pdfFeedback }: {
  open: boolean; onClose: () => void; configuration: ConfigurationV1; quote: QuoteState; revision: number;
  onPdf?: () => void; pdfReady?: boolean;
  /** The page-level feedback is hidden behind the dialog, so the result is repeated here. */
  pdfFeedback?: { state: 'idle' | 'pending' | 'success' | 'error'; message?: string };
}) {
  const quoteCurrent = 'revision' in quote && quote.revision === revision;
  const ready = quoteCurrent && quote.status === 'ready';
  const priceStatus = !quoteCurrent || quote.status === 'missing_data'
    ? { tone: 'warning' as const, title: 'Preis noch nicht verfügbar', message: 'Gültige Preisdaten stehen noch aus.' }
    : quote.status === 'loading'
      ? { tone: 'pending' as const, title: 'Preis wird berechnet', message: 'Dieser Entwurf wird gerade aktualisiert.' }
      : quote.status === 'error'
        ? { tone: 'error' as const, title: 'Preis konnte nicht geladen werden', message: 'Bitte versuchen Sie es später erneut.' }
        : { tone: 'success' as const, title: formatMoney(quote.amountMinor, quote.currency), message: `Preisstand ${quote.priceVersion}` };
  return (
    <Modal open={open} title="Übersicht und nächste Schritte" description="Alle Angaben beziehen sich auf denselben Entwurf."
      onClose={onClose} size="wide">
      <div className="overview-grid">
        <section className="overview-card" aria-labelledby="overview-config-heading">
          <h3 id="overview-config-heading">Konfiguration</h3>
          <p className="overview-product">{de.products[configuration.productId]} · {de.roofMaterials[configuration.roofMaterialId]}</p>
          <dl className="overview-list">
            <SummaryRow label="Breite" value={formatLength(configuration.dimensionsMm.width)} />
            <SummaryRow label="Tiefe" value={formatLength(configuration.dimensionsMm.depth)} />
            <SummaryRow label="Höhe hinten" value={formatLength(configuration.dimensionsMm.rearHeight)} />
            <SummaryRow label="Höhe vorne" value={formatLength(configuration.dimensionsMm.frontHeight)} />
            <SummaryRow label="Dachfelder" value={configuration.roofBayCount === null ? 'Automatische Mindestaufteilung' : String(configuration.roofBayCount)} />
            <SummaryRow label="Pfosten" value={configuration.postCenters ? String(configuration.postCenters.length) : 'Noch nicht festgelegt'} />
          </dl>
        </section>
        <section className="overview-card" aria-labelledby="overview-roof-heading">
          <h3 id="overview-roof-heading">Eindeckung und Material</h3>
          <dl className="overview-list">
            <SummaryRow label="Dachmaterial" value={roofMaterials[configuration.roofMaterialId].nameDe} />
            <SummaryRow label="Farbe" value={de.frameColors[configuration.frameColor]} />
            <SummaryRow label="Max. Plattenbreite" value={formatLength(roofMaterials[configuration.roofMaterialId].maxPanelWidthMm)} />
            <SummaryRow label="Preiswährung" value={ready ? quote.currency : 'Noch nicht verfügbar'} />
          </dl>
        </section>
        <section className="overview-card overview-price" aria-label="Preisstatus">
          <StatusMessage tone={priceStatus.tone} title={priceStatus.title}>{priceStatus.message}</StatusMessage>
          <p className="overview-disclaimer">Diese Übersicht ist kein Angebot und keine Bestellbestätigung. Technische Freigabe kann erforderlich sein.</p>
          <Button variant="primary" icon="save" onClick={onPdf} disabled={!onPdf || !pdfReady}>
            {pdfReady ? 'PDF-Entwurf speichern' : 'PDF-Entwurf noch nicht verfügbar'}
          </Button>
          {pdfFeedback && pdfFeedback.state !== 'idle' && pdfFeedback.message &&
            <StatusMessage tone={pdfFeedback.state === 'success' ? 'success' : pdfFeedback.state === 'error' ? 'error' : 'pending'}>
              {pdfFeedback.message}
            </StatusMessage>}
        </section>
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="overview-list__row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatLength(valueMm: number | null): string {
  if (valueMm === null) return 'Noch nicht angegeben';
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(valueMm / 10)} cm`;
}

function formatMoney(amountMinor: number, currency: string): string {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountMinor / 100); }
  catch { return 'Preisangabe nicht verfügbar'; }
}
