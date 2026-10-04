import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProductId } from '../../catalog/catalog';
import { de } from '../../content/de';
import type { ConfigurationV1 } from '../../domain/configuration';
import { withProduct } from '../../domain/adjustDimensions';
import { evaluateConfiguration } from '../../domain/evaluateConfiguration';
import { listFields } from '../../domain/fieldEquipment';
import { roofFinishes } from '../../catalog/catalog';
import { millimetresToCentimetres } from '../../domain/units';
import type { QuoteState } from '../../state/configuratorStore';
import { Icon } from '../../ui/Icon';
import { NoticeStack } from '../../ui/NoticeStack';
import type { Backdrop, ViewPreset } from '../viewer/PreviewViewer';
import { ArMenu, type ProfileModelStatus } from './components/ArMenu';
import { ConstructionSettings } from './components/ConstructionSettings';
import { EquipmentSettings } from './components/EquipmentSettings';
import { FieldSettings } from './components/FieldSettings';
import { PlanOverview } from './components/PlanOverview';
import { QuoteSummary } from './components/QuoteSummary';
import { RoofSettings } from './components/RoofSettings';
import { ScenePlaceholder } from './components/ScenePlaceholder';
import './styles.css';
import './v2.css';
import '../../styles/global.css';

export type ConfiguratorActionStatus = { state: 'idle' | 'pending' | 'success' | 'error'; message?: string };
export type ConfiguratorSection = 'construction' | 'roof' | 'equipment' | 'field';

export type ConfiguratorShellProps = {
  configuration: ConfigurationV1;
  revision: number;
  quote: QuoteState;
  scene?: ReactNode;
  sceneStatus?: 'loading' | 'ready' | 'missing' | 'error';
  /** Isolated profile viewer for the AR menu's profile dialog. */
  renderProfile: (productId: ProductId) => ReactNode;
  profileStatus?: ProfileModelStatus;
  pdfStatus?: 'unavailable' | 'ready' | 'working' | 'error';
  arStatus?: 'unavailable' | 'ready' | 'working' | 'error';
  pdfFeedback?: ConfiguratorActionStatus;
  saveBusy?: boolean;
  openBusy?: boolean;
  onConfigurationChange: (next: ConfigurationV1) => void;
  onOpenDraft?: () => void;
  onSaveDraft?: () => void;
  onCreatePdf?: () => void;
  selectedPostId?: string | null;
  onSelectPost?: (postId: string | null) => void;
  /** Roof field selected in the model or in the Dach section (inside-left index). */
  selectedRoofField?: number | null;
  onSelectRoofField?: (index: number | null) => void;
  /** Front/side field selected in the model or in the Feld section; `fieldFocus` changes on every pick. */
  selectedFieldId?: string | null;
  fieldFocus?: number;
  onSelectField?: (fieldId: string | null) => void;
  onHighlightFields?: (fieldIds: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  view: ViewPreset;
  onViewChange: (view: ViewPreset) => void;
  onResetView?: () => void;
  backdrop: Backdrop;
  onBackdropChange: (backdrop: Backdrop) => void;
  showDimensions?: boolean;
  onToggleDimensions?: () => void;
};

const sectionText: Record<ConfiguratorSection, { label: string; description: string }> = {
  construction: { label: 'Konstruktion', description: 'Modell, Grundmaße, Dachneigung und Pfosten festlegen.' },
  roof: { label: 'Dach', description: de.sections.roof.description },
  equipment: { label: 'Ausstattung', description: 'Element wählen, dann die Felder festlegen.' },
  field: { label: 'Feld', description: 'Ausstattung je Öffnung. Feld im Modell antippen oder hier wählen.' },
};
const viewLabels: Record<ViewPreset, string> = { '3d': '3D', front: 'Vorne', side: 'Seite', top: 'Oben' };

/**
 * V2 layout (Claude Design "Veranda Konfigurator v2", 2 Oct 2026): every menu in one stacked glass column on
 * the left (one section open at a time, the others collapse to a summary line); viewer controls float on the
 * 3D view. On phones the column becomes a bottom sheet with section chips.
 */
export function ConfiguratorShell({
  configuration, revision, quote, scene, sceneStatus = 'missing', renderProfile, profileStatus = 'missing',
  pdfStatus = 'unavailable', arStatus = 'unavailable', pdfFeedback = { state: 'idle' }, saveBusy = false, openBusy = false,
  onConfigurationChange, onOpenDraft, onSaveDraft, onCreatePdf, selectedPostId = null, onSelectPost,
  selectedRoofField = null, onSelectRoofField, selectedFieldId = null, fieldFocus = 0, onSelectField, onHighlightFields,
  onUndo, onRedo, view, onViewChange, onResetView, backdrop, onBackdropChange, showDimensions = false, onToggleDimensions,
}: ConfiguratorShellProps) {
  const [section, setSection] = useState<ConfiguratorSection>('construction');
  // A roof field tapped in the model opens Dach; a front/side field opens Feld.
  useEffect(() => { if (selectedRoofField !== null) setSection('roof'); }, [selectedRoofField]);
  useEffect(() => { if (selectedFieldId !== null) setSection('field'); }, [selectedFieldId, fieldFocus]);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const evaluation = useMemo(() => evaluateConfiguration(configuration), [configuration]);
  const productName = de.products[configuration.productId];
  const materialName = de.roofMaterials[configuration.roofMaterialId];
  const { width, depth } = configuration.dimensionsMm;
  const measurementSummary = width !== null && depth !== null ? `${formatCm(width)} × ${formatCm(depth)} cm` : '';
  const fields = listFields(configuration);
  const equippedFields = configuration.fieldEquipment.length;
  const elementCount = configuration.fieldEquipment.reduce((sum, entry) => sum + entry.elements.length, 0)
    + configuration.sideLayouts.filter((layout) => layout.gable).length;
  const summaries: Record<ConfiguratorSection, string> = {
    construction: [productName, measurementSummary, configuration.postCenters ? `${configuration.postCenters.length} Pfosten` : ''].filter(Boolean).join(' · '),
    roof: [materialName, roofFinishes[configuration.roofFinish].toneDe, evaluation.roof ? `${evaluation.roof.bayCount} Dachfelder` : ''].filter(Boolean).join(' · '),
    equipment: elementCount ? `${elementCount} ${elementCount === 1 ? 'Element' : 'Elemente'} · ${equippedFields} ${equippedFields === 1 ? 'Feld' : 'Felder'}` : 'Noch nichts gewählt',
    field: `${fields.filter((field) => field.kind === 'front').length} vorne · ${fields.filter((field) => field.kind === 'side').length} seitlich${fields.some((field) => field.kind === 'rear') ? ` · ${fields.filter((field) => field.kind === 'rear').length} hinten` : ''}`,
  };

  const update = (next: ConfigurationV1) => onConfigurationChange(structuredClone(next));
  const changeProduct = (productId: ProductId) => update(withProduct(configuration, productId));
  const openSection = (next: ConfiguratorSection) => {
    setSection(next);
    if (next !== 'field') onSelectField?.(null);
  };

  const body = (id: ConfiguratorSection) => {
    switch (id) {
      case 'construction': return <ConstructionSettings configuration={configuration} evaluation={evaluation} onChange={update}
        onProductChange={changeProduct} selectedPostId={selectedPostId} onSelectPost={onSelectPost} />;
      case 'roof': return <RoofSettings configuration={configuration} evaluation={evaluation} onChange={update}
        selectedRoofField={selectedRoofField} onSelectRoofField={onSelectRoofField} />;
      case 'equipment': return <EquipmentSettings configuration={configuration} onChange={update} onHighlightFields={onHighlightFields ?? (() => undefined)} />;
      case 'field': return <FieldSettings configuration={configuration} onChange={update} selectedFieldId={selectedFieldId}
        onSelectField={(fieldId) => onSelectField?.(fieldId)} />;
    }
  };

  return (
    <main className="v2-app" data-backdrop={backdrop}>
      <aside className="v2-panel" aria-label="Konfiguration">
        <div className="v2-card v2-brand">
          <img className="v2-brand__logo" src={`${import.meta.env.BASE_URL}images/brand/eg-veranda-logo.avif`} alt="EG Veranda Hamburg GmbH" />
          <div className="v2-brand__actions">
            <button type="button" className="v2-tool-button" title="Entwurf öffnen" aria-label="Entwurf öffnen" disabled={!onOpenDraft || openBusy} onClick={onOpenDraft}><Icon name="open" /></button>
            <button type="button" className="v2-tool-button v2-tool-button--dark" title="Entwurf speichern" aria-label="Entwurf speichern" disabled={!onSaveDraft || saveBusy} onClick={onSaveDraft}><Icon name="save" /></button>
          </div>
        </div>
        <div className="v2-chips" role="tablist" aria-label="Bereich auswählen">
          {(Object.keys(sectionText) as ConfiguratorSection[]).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} className="v2-chip-tab" onClick={() => openSection(id)}>{sectionText[id].label}</button>
          ))}
        </div>
        {(Object.keys(sectionText) as ConfiguratorSection[]).map((id) => section === id ? (
          <section key={id} className="v2-card v2-section v2-section--open" aria-labelledby={`section-${id}`}>
            <button type="button" className="v2-section__head" aria-expanded="true" onClick={() => openSection(id)}>
              <span className="v2-section__titles"><h2 id={`section-${id}`}>{sectionText[id].label}</h2><p>{sectionText[id].description}</p></span>
              <span className="v2-section__chevron v2-section__chevron--open" aria-hidden="true"><Icon name="chevron-down" /></span>
            </button>
            <div className="v2-section__body" key={id}>{body(id)}</div>
          </section>
        ) : (
          <button key={id} type="button" className="v2-card v2-section v2-section--closed" aria-expanded="false" onClick={() => openSection(id)}>
            <span className="v2-row-text"><strong>{sectionText[id].label}</strong><small>{summaries[id]}</small></span>
            <span className="v2-section__chevron" aria-hidden="true"><Icon name="chevron-down" /></span>
          </button>
        ))}
      </aside>

      <section className="v2-stage" aria-label="3D-Vorschau">
        <div className="v2-stage__viewport">
          {scene ? <div className="scene-slot">{scene}</div> : <ScenePlaceholder status={sceneStatus} />}
        </div>
        <div className="v2-float v2-history" role="toolbar" aria-label="Verlauf">
          <button type="button" className="v2-round-button" aria-label="Rückgängig" title="Rückgängig" disabled={!onUndo} onClick={onUndo}><Icon name="undo" /></button>
          <button type="button" className="v2-round-button" aria-label="Wiederholen" title="Wiederholen" disabled={!onRedo} onClick={onRedo}><Icon name="redo" /></button>
          <span className="v2-divider" aria-hidden="true" />
          <button type="button" className="v2-round-button" aria-label="Ansicht zurücksetzen" title="Ansicht zurücksetzen" disabled={!onResetView} onClick={onResetView}><Icon name="reset" /></button>
        </div>
        <div className="v2-center-bar">
          <div className="v2-float v2-views" role="toolbar" aria-label="Ansicht">
            {(Object.keys(viewLabels) as ViewPreset[]).map((id) => (
              <button key={id} type="button" className="v2-pill" aria-pressed={view === id} onClick={() => onViewChange(id)}>{viewLabels[id]}</button>
            ))}
            <span className="v2-divider" aria-hidden="true" />
            <button type="button" className="v2-pill v2-pill--icon" aria-pressed={showDimensions} disabled={!onToggleDimensions} onClick={onToggleDimensions}>
              <Icon name="measure" />Bemaßungen</button>
            <span className="v2-divider" aria-hidden="true" />
            <div className="v2-backdrop-switch" role="radiogroup" aria-label="Hintergrund">
              {(['studio', 'garden'] as const).map((id) => (
                <button key={id} type="button" role="radio" aria-checked={backdrop === id} onClick={() => onBackdropChange(id)}>{id === 'studio' ? 'Studio' : 'Garten'}</button>
              ))}
            </div>
          </div>
        </div>
        <ArMenu configuration={configuration} productId={configuration.productId} profileStatus={profileStatus} renderProfile={renderProfile}
          arReady={arStatus === 'ready'} />
        <NoticeStack />
        <div className="v2-quote-slot">
          <QuoteSummary quote={quote} revision={revision} productName={productName} materialName={materialName}
            measurements={measurementSummary} onOverview={() => setOverviewOpen(true)} onPdf={onCreatePdf} pdfState={pdfStatus} />
        </div>
      </section>

      <PlanOverview open={overviewOpen} onClose={() => setOverviewOpen(false)} configuration={configuration} quote={quote}
        revision={revision} onPdf={onCreatePdf} pdfReady={pdfStatus === 'ready'} pdfFeedback={pdfFeedback} />
    </main>
  );
}

function formatCm(valueMm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(millimetresToCentimetres(valueMm));
}
