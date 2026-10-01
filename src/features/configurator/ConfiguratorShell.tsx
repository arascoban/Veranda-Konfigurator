import { useMemo, useState, type ReactNode, useEffect } from 'react';
import { de } from '../../content/de';
import type { ConfigurationV1 } from '../../domain/configuration';
import { withProduct } from '../../domain/adjustDimensions';
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
import { NoticeStack } from '../../ui/NoticeStack';
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
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  /** Roof field selected in the model or in the Dach section (inside-left index). */
  selectedRoofField?: number | null;
  onSelectRoofField?: (index: number | null) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onResetView?: () => void;
  showDimensions?: boolean;
  onToggleDimensions?: () => void;
};

export function ConfiguratorShell({
  configuration, revision, quote, scene, sceneStatus = 'missing', productModelStatus = 'missing', profileModel,
  pdfStatus = 'unavailable', arStatus = 'unavailable', profileArStatus = 'unavailable', saveStatus = { state: 'idle' }, openStatus = { state: 'idle' },
  pdfFeedback = { state: 'idle' },
  onConfigurationChange, onOpenDraft, onSaveDraft, onCreatePdf, onShowAr, onShowProfileAr, selectedPostId = null, onSelectPost, selectedRoofField = null, onSelectRoofField, onUndo, onRedo, onResetView, showDimensions = false, onToggleDimensions,
}: ConfiguratorShellProps) {
  const [section, setSection] = useState<ConfiguratorSection>('construction');
  // A roof field tapped in the model opens the Dach section where its tone is chosen.
  useEffect(() => { if (selectedRoofField !== null) setSection('roof'); }, [selectedRoofField]);
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
  const changeProduct = (productId: ConfigurationV1['productId']) => update(withProduct(configuration, productId));

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
              <ConstructionSettings configuration={configuration} evaluation={evaluation} onChange={update} selectedPostId={selectedPostId} onSelectPost={onSelectPost} />
              <div className="construction-actions">
                <ProfileInspector productId={configuration.productId} modelStatus={productModelStatus} profileModel={profileModel}
                  arReady={profileArStatus === 'ready'} onShowAr={onShowProfileAr} />
              </div>
            </>}
            {section === 'roof' && <RoofSettings configuration={configuration} evaluation={evaluation} onChange={update}
              selectedRoofField={selectedRoofField} onSelectRoofField={onSelectRoofField} />}
            {section === 'equipment' && <ComingSoon title="Ausstattung folgt" message="Seitenwände, Schiebeelemente, Festglas und Markisen werden je Feld ergänzt, sobald die jeweilige Konfiguration freigegeben ist. Ein Feld im Modell antippen zeigt seinen Namen." />}
          </div>
          <footer className="configurator-panel__footer">
            <span className="configurator-panel__footer-hint">Bereich frei wählen</span>
            <Button variant="primary" size="small" icon="arrow-right" onClick={() => setOverviewOpen(true)}>Zur Übersicht</Button>
          </footer>
        </aside>

        <section className="scene-column" aria-label="3D-Vorschau">
          <div className="scene-column__head">3D-Vorschau · {productName}</div>
          <div className="scene-toolbar" role="toolbar" aria-label="Werkzeuge für die Ansicht">
            <button className="icon-button" type="button" aria-label="Rückgängig" title="Rückgängig" disabled={!onUndo} onClick={onUndo}><Icon name="undo" /></button>
            <button className="icon-button" type="button" aria-label="Wiederholen" title="Wiederholen" disabled={!onRedo} onClick={onRedo}><Icon name="redo" /></button>
            <span className="scene-toolbar__divider" aria-hidden="true" />
            <button className="icon-button" type="button" aria-label="Ansicht zurücksetzen" title="Ansicht zurücksetzen" disabled={!onResetView} onClick={onResetView}><Icon name="reset" /></button>
            <button className={`scene-toolbar__toggle ${showDimensions ? 'scene-toolbar__toggle--active' : ''}`} type="button" aria-pressed={showDimensions}
              disabled={!onToggleDimensions} onClick={onToggleDimensions}><Icon name="measure" /> Bemaßungen</button>
            <button className="icon-button" type="button" aria-label={opaque ? 'Glasansicht aktivieren' : 'Opake Ansicht aktivieren'}
              title={opaque ? 'Glasansicht aktivieren' : 'Opake Ansicht aktivieren'} aria-pressed={opaque} onClick={() => setOpaque((value) => !value)}><Icon name={opaque ? 'sun' : 'info'} /></button>
            <button className="scene-expand-button" type="button" onClick={() => setSceneExpanded((value) => !value)}>
              {sceneExpanded ? 'Einstellungen anzeigen' : 'Ansicht vergrößern'}
            </button>
          </div>
          <div className="scene-column__viewport">
            {scene ? <div className="scene-slot">{scene}</div> : <ScenePlaceholder status={sceneStatus} />}
          </div>
          <NoticeStack />
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
