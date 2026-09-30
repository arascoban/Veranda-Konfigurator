import { useMemo, useState, type ReactNode } from 'react';
import { de } from '../../content/de';
import type { ConfigurationV1 } from '../../domain/configuration';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { millimetresToCentimetres } from '../../domain/units';
import type { QuoteState } from '../../state/configuratorStore';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StatusMessage, type StatusTone } from '../../ui/StatusMessage';
import { ConstructionSettings } from './components/ConstructionSettings';
import { ConfiguratorHeader } from './components/ConfiguratorHeader';
import { ProfileInspector, type ProductModelStatus } from './components/ProfileInspector';
import { PlanOverview } from './components/PlanOverview';
import { QuoteSummary } from './components/QuoteSummary';
import { RoofSettings } from './components/RoofSettings';
import { ScenePlaceholder } from './components/ScenePlaceholder';
import { SectionPicker, type ConfiguratorSection } from './components/SectionPicker';
import './styles.css';
import '../../styles/global.css';

export type ConfiguratorActionStatus = { state: 'idle' | 'pending' | 'success' | 'error'; message?: string };
export type ConfiguratorShellProps = {
  configuration: ConfigurationV1;
  revision: number;
  quote: QuoteState;
  scene?: ReactNode;
  sceneStatus?: 'loading' | 'ready' | 'missing' | 'error';
  productModelStatus?: ProductModelStatus;
  profileModel?: ReactNode;
  pdfStatus?: 'unavailable' | 'ready' | 'working' | 'error';
  arStatus?: 'unavailable' | 'ready' | 'working' | 'error';
  profileArStatus?: 'unavailable' | 'ready' | 'working' | 'error';
  saveStatus?: ConfiguratorActionStatus;
  openStatus?: ConfiguratorActionStatus;
  pdfFeedback?: ConfiguratorActionStatus;
  onConfigurationChange: (next: ConfigurationV1) => void;
  onOpenDraft?: () => void;
  onSaveDraft?: () => void;
  onCreatePdf?: () => void;
  onShowAr?: () => void;
  onShowProfileAr?: () => void;
  onEditPosts?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onResetView?: () => void;
};

export function ConfiguratorShell({
  configuration, revision, quote, scene, sceneStatus = 'missing', productModelStatus = 'missing', profileModel,
  pdfStatus = 'unavailable', arStatus = 'unavailable', profileArStatus = 'unavailable', saveStatus = { state: 'idle' }, openStatus = { state: 'idle' },
  pdfFeedback = { state: 'idle' },
  onConfigurationChange, onOpenDraft, onSaveDraft, onCreatePdf, onShowAr, onShowProfileAr, onEditPosts, onUndo, onRedo, onResetView,
}: ConfiguratorShellProps) {
  const [section, setSection] = useState<ConfiguratorSection>('construction');
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [opaque, setOpaque] = useState(false);
  const [sceneExpanded, setSceneExpanded] = useState(false);
  const evaluation = useMemo(() => evaluateConfiguration(configuration), [configuration]);
  const productName = de.products[configuration.productId];
  const materialName = de.roofMaterials[configuration.roofMaterialId];
  const dimensions = configuration.dimensionsMm;
  const measurementSummary = dimensions.width !== null && dimensions.depth !== null
    ? `${formatLength(dimensions.width)} × ${formatLength(dimensions.depth)}`
    : '';
  const activeContent = de.sections[section];

  const update = (next: ConfigurationV1) => onConfigurationChange(structuredClone(next));
  const changeProduct = (productId: ConfigurationV1['productId']) => update({ ...configuration, productId });
  const quoteNote = quote.status === 'ready' && 'revision' in quote && quote.revision === revision
    ? 'Preisstand ' + quote.priceVersion : 'Preis wird erst mit vollständigen Preisdaten angezeigt.';

  return (
    <main className={`configurator-app ${opaque ? 'opaque-mode' : ''} ${sceneExpanded ? 'configurator-app--scene-expanded' : ''}`}>
      <ConfiguratorHeader productId={configuration.productId} onProductChange={changeProduct}
        onOpen={onOpenDraft} onSave={onSaveDraft} canOpen={openStatus.state !== 'pending'} canSave={saveStatus.state !== 'pending'} />

      {(saveStatus.state !== 'idle' || openStatus.state !== 'idle' || pdfFeedback.state !== 'idle') && <div className="configurator-feedback" aria-live="polite">
        {saveStatus.state !== 'idle' && <ActionFeedback title="Entwurf speichern" status={saveStatus} />}
        {openStatus.state !== 'idle' && <ActionFeedback title="Entwurf öffnen" status={openStatus} />}
        {pdfFeedback.state !== 'idle' && <ActionFeedback title="PDF-Entwurf" status={pdfFeedback} />}
      </div>}

      <div className={`configurator-workspace ${sceneExpanded ? 'configurator-workspace--expanded' : ''}`}>
        <aside className="configurator-panel glass-surface" aria-label="Konfiguration">
          <div className="configurator-panel__head">
            <p className="eyebrow">Konfigurator</p>
            <h1 className="configurator-panel__title">{activeContent.title}</h1>
            <p className="configurator-panel__description">{activeContent.description}</p>
          </div>
          <SectionPicker value={section} onChange={setSection} />
          <div className="configurator-panel__body" key={section}>
            {section === 'construction' && <>
              <ConstructionSettings configuration={configuration} evaluation={evaluation} onChange={update} onEditPosts={onEditPosts} />
              <div className="construction-actions">
                <ProfileInspector productId={configuration.productId} modelStatus={productModelStatus} profileModel={profileModel}
                  arReady={profileArStatus === 'ready'} onShowAr={onShowProfileAr} />
              </div>
            </>}
            {section === 'roof' && <RoofSettings configuration={configuration} evaluation={evaluation} onChange={update} />}
            {section === 'equipment' && <ComingSoon title="Ausstattung folgt" message="Weitere Ausstattung erscheint hier, sobald Varianten und Produktregeln bestätigt sind." />}
            {section === 'opening' && <ComingSoon title="Noch keine Feldoption verfügbar" message="Seitenwände und Schiebeelemente werden ergänzt, sobald die jeweilige Konfiguration freigegeben ist." />}
            {section === 'overview' && <OverviewSection configuration={configuration} quote={quote} revision={revision} quoteNote={quoteNote}
              onPdf={onCreatePdf} pdfStatus={pdfStatus} onOpenOverview={() => setOverviewOpen(true)} />}
          </div>
          <footer className="configurator-panel__footer">
            <span className="configurator-panel__footer-hint">Bereich frei wählen</span>
            {section !== 'overview' && <Button variant="primary" size="small" icon="arrow-right"
              onClick={() => setSection('overview')}>Zur Übersicht</Button>}
          </footer>
        </aside>

        <section className="scene-column" aria-label="3D-Vorschau">
          <div className="scene-column__head">3D-Vorschau · {productName}</div>
          <div className="scene-toolbar" role="toolbar" aria-label="Werkzeuge für die Ansicht">
            <button className="icon-button" type="button" aria-label="Rückgängig" title="Rückgängig" disabled={!onUndo} onClick={onUndo}><Icon name="undo" /></button>
            <button className="icon-button" type="button" aria-label="Wiederholen" title="Wiederholen" disabled={!onRedo} onClick={onRedo}><Icon name="redo" /></button>
            <span className="scene-toolbar__divider" aria-hidden="true" />
            <button className="icon-button" type="button" aria-label="Ansicht zurücksetzen" title="Ansicht zurücksetzen" disabled={!onResetView} onClick={onResetView}><Icon name="reset" /></button>
            <button className="icon-button" type="button" aria-label={opaque ? 'Glasansicht aktivieren' : 'Opake Ansicht aktivieren'}
              title={opaque ? 'Glasansicht aktivieren' : 'Opake Ansicht aktivieren'} aria-pressed={opaque} onClick={() => setOpaque((value) => !value)}><Icon name={opaque ? 'sun' : 'info'} /></button>
            <button className="scene-expand-button" type="button" onClick={() => setSceneExpanded((value) => !value)}>
              {sceneExpanded ? 'Einstellungen anzeigen' : 'Ansicht vergrößern'}
            </button>
          </div>
          <div className="scene-column__viewport">
            {scene ? <div className="scene-slot">{scene}</div> : <ScenePlaceholder status={sceneStatus} />}
          </div>
          <div className="quote-float">
            <QuoteSummary quote={quote} revision={revision} productName={productName} materialName={materialName}
              measurements={measurementSummary} onOverview={() => setOverviewOpen(true)} onPdf={onCreatePdf} onAr={onShowAr}
              pdfState={pdfStatus} arState={arStatus} />
          </div>
        </section>
      </div>

      <PlanOverview open={overviewOpen} onClose={() => setOverviewOpen(false)} configuration={configuration} quote={quote}
        revision={revision} onPdf={onCreatePdf} pdfReady={pdfStatus === 'ready'} pdfFeedback={pdfFeedback} />
    </main>
  );
}

function ComingSoon({ title, message }: { title: string; message: string }) {
  return <div className="coming-soon-card"><h3>{title}</h3><p>{message}</p></div>;
}

function OverviewSection({ configuration, quote, revision, quoteNote, onPdf, pdfStatus, onOpenOverview }: {
  configuration: ConfigurationV1; quote: QuoteState; revision: number; quoteNote: string;
  onPdf?: () => void; pdfStatus: 'unavailable' | 'ready' | 'working' | 'error'; onOpenOverview: () => void;
}) {
  const currentQuoteReady = quote.status === 'ready' && quote.revision === revision;
  const tone: StatusTone = currentQuoteReady ? 'success' : quote.status === 'error' ? 'error' : 'warning';
  return <section className="overview-section" aria-label="Zusammenfassung">
    <div className="overview-card">
      <h3>{de.products[configuration.productId]} · {de.roofMaterials[configuration.roofMaterialId]}</h3>
      <dl className="overview-list">
        <SummaryLine label="Breite" value={formatLength(configuration.dimensionsMm.width)} />
        <SummaryLine label="Tiefe" value={formatLength(configuration.dimensionsMm.depth)} />
        <SummaryLine label="Höhe hinten" value={formatLength(configuration.dimensionsMm.rearHeight)} />
        <SummaryLine label="Höhe vorne" value={formatLength(configuration.dimensionsMm.frontHeight)} />
      </dl>
    </div>
    <StatusMessage tone={tone} title={currentQuoteReady ? formatPrice(quote.amountMinor, quote.currency) : 'Preis noch nicht verfügbar'}>{quoteNote}</StatusMessage>
    <StatusMessage tone="info" title="Technischer Hinweis">Die Konfiguration ist noch nicht zur Fertigung freigegeben.</StatusMessage>
    <Button onClick={onOpenOverview} icon="external">Übersicht öffnen</Button>
    <Button variant="secondary" onClick={onPdf} disabled={!onPdf || pdfStatus !== 'ready'} icon="save">
      {pdfStatus === 'ready' ? 'PDF-Entwurf speichern' : 'PDF noch nicht verfügbar'}
    </Button>
  </section>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="overview-list__row"><dt>{label}</dt><dd>{value}</dd></div>;
}

function ActionFeedback({ title, status }: { title: string; status: ConfiguratorActionStatus }) {
  const tone: StatusTone = status.state === 'success' ? 'success' : status.state === 'error' ? 'error' : 'pending';
  const defaultText = status.state === 'pending' ? 'Wird ausgeführt …' : status.state === 'success' ? 'Abgeschlossen.' : 'Aktion fehlgeschlagen.';
  return <StatusMessage tone={tone} title={title}>{status.message || defaultText}</StatusMessage>;
}

function formatLength(valueMm: number | null): string {
  return valueMm === null ? 'Noch nicht angegeben'
    : `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(millimetresToCentimetres(valueMm))} cm`;
}

function formatPrice(amountMinor: number, currency: string): string {
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amountMinor / 100); }
  catch { return 'Preisangabe nicht verfügbar'; }
}
