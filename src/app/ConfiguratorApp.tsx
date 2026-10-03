import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ConfigurationV1 } from '../domain/configuration';
import { MAX_WIDTH_MM } from '../catalog/catalog';
import { awningChangeNotice, reconcileAwning } from '../domain/awning';
import { useNoticeStore } from '../state/noticeStore';
import { evaluateConfiguration } from '../domain/evaluateConfiguration';
import { addToField, hasKind, reconcileFieldEquipment, type EquipmentKind } from '../domain/fieldEquipment';
import { cornerRafterPitches } from '../domain/cornerRafters';
import type { Backdrop, ViewPreset } from '../features/viewer/PreviewViewer';
import { ConfiguratorShell, type ConfiguratorActionStatus } from '../features/configurator';
import { createPdfDraft, downloadPdf } from '../features/pdf/service/pdfExport';
import { createMinimumPostLayout } from '../features/viewer/postEditing';
import { loadLocalDraft, saveLocalDraft } from '../services/configurations/localDraft';
import { createConfigurationHistory } from '../state/configurationHistory';
import { useConfiguratorStore } from '../state/configuratorStore';

const PreviewViewer = lazy(() => import('../features/viewer/PreviewViewer').then(({ PreviewViewer: Component }) => ({ default: Component })));
const ProfileViewer = lazy(() => import('../features/viewer/ProfileViewer').then(({ ProfileViewer: Component }) => ({ default: Component })));

export function ConfiguratorApp() {
  const configuration = useConfiguratorStore((state) => state.configuration);
  const revision = useConfiguratorStore((state) => state.revision);
  const quote = useConfiguratorStore((state) => state.quote);
  const history = useRef(createConfigurationHistory());
  const [, refreshHistory] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedRoofField, setSelectedRoofField] = useState<number | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [fieldFocus, setFieldFocus] = useState(0);
  const [highlightFieldIds, setHighlightFieldIds] = useState<string[]>([]);
  const [view, setView] = useState<{ preset: ViewPreset; token: number }>({ preset: '3d', token: 0 });
  const [backdrop, setBackdrop] = useState<Backdrop>('studio');
  const [resetViewToken, setResetViewToken] = useState(0);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  // The profile dialog has its own viewer and its own loading state (ASTRA-GP-03).
  const [profileStatus, setProfileStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('missing');
  // Save/open results appear as notices over the 3D view (V2), so the layout never shifts.
  const report = (title: string, status: ConfiguratorActionStatus) => {
    if (status.message) useNoticeStore.getState().push({ title, message: status.message });
  };
  const setSaveStatus = (status: ConfiguratorActionStatus) => report('Entwurf speichern', status);
  const setOpenStatus = (status: ConfiguratorActionStatus) => report('Entwurf öffnen', status);
  const [pdfStatus, setPdfStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });
  useEffect(() => { if (pdfStatus.state === 'success' || pdfStatus.state === 'error') report('PDF-Entwurf', pdfStatus); }, [pdfStatus]);
  const pdfPossible = useMemo(() => evaluateConfiguration(configuration).status === 'requires_engineering_review', [configuration]);

  const applyConfiguration = (candidate: ConfigurationV1, preserveAuto = true) => {
    const current = useConfiguratorStore.getState().configuration;
    const reconciled = { ...candidate, awning: reconcileAwning(candidate) };
    if (JSON.stringify(reconciled.awning) !== JSON.stringify(candidate.awning)) {
      const notice = awningChangeNotice(candidate.awning, reconciled.awning, reconciled);
      if (notice) useNoticeStore.getState().push(notice);
    }
    const laidOut = preserveAuto ? preserveAutomaticPostLayout(current, reconciled) : reconciled;
    // Equipment on fields that vanished with a post change is dropped; the customer is told which fields.
    const equipment = reconcileFieldEquipment(current, laidOut);
    if (equipment.dropped.length) {
      useNoticeStore.getState().push({ title: 'Ausstattung entfernt', message: `Felder oder Maße haben sich geändert; entfernt: ${equipment.dropped.join(', ')}. Eine Glasschiebewand braucht 120–596 cm lichte Weite und mindestens 100 cm Höhe.` });
    } else if (equipment.clamped) {
      useNoticeStore.getState().push({ title: 'Aufteilung angepasst', message: 'Die Feldhöhe hat sich geändert; die Aufteilung der Elemente wurde angepasst.' });
    }
    let next = equipment.configuration;
    // Corner rafter over an inset end post with side equipment (3 Oct 2026): when that layout appears, changes or
    // goes, the bay count and per-field tones start fresh and the customer is told why the outer bay is narrow.
    const cornersBefore = evaluateConfiguration(current).roof?.postSideFields;
    const cornersAfter = cornerRafterPitches(next);
    if (JSON.stringify(cornersBefore ?? null) !== JSON.stringify(cornersAfter)) {
      next = { ...next, roofBayCount: null, roofFieldFinishes: [] };
      if (cornersAfter) {
        const sides = [cornersAfter.leftMm ? `links ${formatCm(cornersAfter.leftMm)} cm` : '', cornersAfter.rightMm ? `rechts ${formatCm(cornersAfter.rightMm)} cm` : ''].filter(Boolean).join(', ');
        useNoticeStore.getState().push({ title: 'Eckträger versetzt', message: `Der Eckpfosten steht eingerückt (${sides}) und an dieser Seite ist Ausstattung gewählt: Ein zusätzlicher Träger steht über dem Pfosten, das äußere Dachfeld wird schmaler, die übrigen Dachfelder bleiben gleich breit.` });
      }
    }
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    if (!useConfiguratorStore.getState().replaceConfiguration(next)) return;
    history.current.record(current);
    refreshHistory((value) => value + 1);
  };
  const undo = () => {
    const current = useConfiguratorStore.getState().configuration;
    const previous = history.current.undo(current);
    if (previous && useConfiguratorStore.getState().replaceConfiguration(previous)) refreshHistory((value) => value + 1);
  };
  const redo = () => {
    const current = useConfiguratorStore.getState().configuration;
    const next = history.current.redo(current);
    if (next && useConfiguratorStore.getState().replaceConfiguration(next)) refreshHistory((value) => value + 1);
  };
  const saveDraft = () => {
    try {
      const result = saveLocalDraft(window.localStorage, useConfiguratorStore.getState().configuration);
      setSaveStatus(result === 'saved'
        ? { state: 'success', message: 'Entwurf auf diesem Gerät gespeichert.' }
        : { state: 'error', message: 'Entwurf konnte auf diesem Gerät nicht gespeichert werden.' });
    } catch {
      setSaveStatus({ state: 'error', message: 'Lokaler Speicher ist nicht verfügbar.' });
    }
  };
  const openDraft = () => {
    try {
      const result = loadLocalDraft(window.localStorage);
      if (result.status === 'loaded') {
        applyConfiguration(result.configuration, false);
        setOpenStatus({ state: 'success', message: 'Gespeicherter Entwurf geöffnet.' });
      } else {
        const message = result.status === 'empty' ? 'Auf diesem Gerät ist noch kein Entwurf gespeichert.'
          : result.status === 'unsupported_version' ? 'Dieser Entwurf stammt aus einer anderen Katalogversion.'
            : 'Der gespeicherte Entwurf konnte nicht gelesen werden.';
        setOpenStatus({ state: 'error', message });
      }
    } catch {
      setOpenStatus({ state: 'error', message: 'Lokaler Speicher ist nicht verfügbar.' });
    }
  };
  const createPdf = async () => {
    if (pdfStatus.state === 'pending') return;
    setPdfStatus({ state: 'pending', message: 'PDF-Entwurf wird erstellt …' });
    // No trusted price source is connected yet; the document states the missing price.
    const result = await createPdfDraft(() => {
      const state = useConfiguratorStore.getState();
      return { configuration: state.configuration, revision: state.revision, quote: null };
    }, {
      // Five fixed views of the same revision, rendered from the real part assembly (ASTRA-GP-08).
      captureViews: async (configuration) => (await import('../features/pdf/service/captureViews')).captureConfigurationViews(configuration),
    });
    if (result.status === 'ready') {
      try {
        downloadPdf(result.bytes, result.fileName);
        setPdfStatus({ state: 'success', message: `${result.fileName} wurde heruntergeladen.` });
      } catch {
        setPdfStatus({ state: 'error', message: 'Der Download konnte nicht gestartet werden.' });
      }
    } else {
      const message = result.status === 'stale' ? 'Die Planung wurde während der Erstellung geändert. Bitte erneut erstellen.'
        : result.status === 'invalid_configuration' ? 'Bitte vervollständigen Sie zuerst alle Maße und die Stützenanordnung.'
          : 'Der PDF-Entwurf konnte nicht erstellt werden.';
      setPdfStatus({ state: 'error', message });
    }
  };

  const selectField = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    setFieldFocus((value) => value + 1);
    if (fieldId) { setSelectedPostId(null); setSelectedRoofField(null); }
  };
  // Radial menu: a new kind is added to the field; an existing one just opens the field in the Feld section.
  const pickForField = (fieldId: string, kind: EquipmentKind) => {
    const current = useConfiguratorStore.getState().configuration;
    if (!hasKind(current, fieldId, kind)) {
      const next = addToField(current, fieldId, kind);
      if (next) applyConfiguration(next);
    }
    selectField(fieldId);
  };

  return <ConfiguratorShell configuration={configuration} revision={revision} quote={quote}
    scene={<Suspense fallback={<p role="status">3D-Vorschau wird geladen …</p>}><PreviewViewer
      configuration={configuration} resetViewToken={resetViewToken} view={view} backdrop={backdrop} showDimensions={showDimensions}
      selectedPostId={selectedPostId} onSelectPost={setSelectedPostId}
      selectedRoofField={selectedRoofField} onSelectRoofField={setSelectedRoofField}
      selectedFieldId={selectedFieldId} onSelectField={selectField} highlightFieldIds={highlightFieldIds} onFieldPick={pickForField}
      onSceneStatusChange={setSceneStatus}
      onPostCentersChange={(posts) => applyConfiguration({ ...useConfiguratorStore.getState().configuration, postCenters: posts })} />
    </Suspense>}
    sceneStatus={sceneStatus} profileStatus={profileStatus}
    renderProfile={(productId) => <Suspense fallback={<p role="status">Profil wird geladen …</p>}>
      <ProfileViewer key={productId} productId={productId} frameColor={configuration.frameColor} onStatusChange={setProfileStatus} /></Suspense>}
    pdfStatus={!pdfPossible ? 'unavailable' : pdfStatus.state === 'pending' ? 'working' : 'ready'}
    pdfFeedback={pdfStatus} onCreatePdf={pdfPossible ? () => void createPdf() : undefined} arStatus={pdfPossible ? 'ready' : 'unavailable'}
    onConfigurationChange={applyConfiguration} onOpenDraft={openDraft} onSaveDraft={saveDraft}
    selectedPostId={selectedPostId} onSelectPost={setSelectedPostId} selectedRoofField={selectedRoofField} onSelectRoofField={setSelectedRoofField}
    selectedFieldId={selectedFieldId} fieldFocus={fieldFocus} onSelectField={selectField} onHighlightFields={setHighlightFieldIds}
    onUndo={history.current.canUndo() ? undo : undefined} onRedo={history.current.canRedo() ? redo : undefined}
    view={view.preset} onViewChange={(preset) => setView((current) => ({ preset, token: current.token + 1 }))}
    onResetView={() => { setView((current) => ({ preset: '3d', token: current.token + 1 })); setResetViewToken((value) => value + 1); }}
    backdrop={backdrop} onBackdropChange={setBackdrop}
    showDimensions={showDimensions} onToggleDimensions={() => setShowDimensions((value) => !value)} />;
}

function preserveAutomaticPostLayout(previous: ConfigurationV1, candidate: ConfigurationV1): ConfigurationV1 {
  const oldWidth = previous.dimensionsMm.width;
  const newWidth = candidate.dimensionsMm.width;
  const productChanged = previous.productId !== candidate.productId;
  if (newWidth === null || newWidth <= 0 || newWidth > MAX_WIDTH_MM ||
    (newWidth === oldWidth && !productChanged)) return candidate;
  const oldAuto = oldWidth !== null ? createMinimumPostLayout(previous.productId, oldWidth) : null;
  const userKeptAuto = previous.postCenters === null || (oldAuto !== null &&
    JSON.stringify(previous.postCenters) === JSON.stringify(oldAuto));
  if (!userKeptAuto || JSON.stringify(candidate.postCenters) !== JSON.stringify(previous.postCenters)) return candidate;
  return { ...candidate, postCenters: createMinimumPostLayout(candidate.productId, newWidth) };
}

function formatCm(mm: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(mm / 10);
}
