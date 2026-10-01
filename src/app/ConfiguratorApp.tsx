import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import type { ConfigurationV1 } from '../domain/configuration';
import { MAX_WIDTH_MM } from '../catalog/catalog';
import { reconcileAwning } from '../domain/awning';
import { evaluateConfiguration } from '../domain/evaluateConfiguration';
import { ConfiguratorShell, type ConfiguratorActionStatus } from '../features/configurator';
import { createPdfDraft, downloadPdf } from '../features/pdf/service/pdfExport';
import { createMinimumPostLayout } from '../features/viewer/postEditing';
import { loadLocalDraft, saveLocalDraft } from '../services/configurations/localDraft';
import { createConfigurationHistory } from '../state/configurationHistory';
import { useConfiguratorStore } from '../state/configuratorStore';

const PreviewViewer = lazy(() => import('../features/viewer/PreviewViewer').then(({ PreviewViewer: Component }) => ({ default: Component })));

export function ConfiguratorApp() {
  const configuration = useConfiguratorStore((state) => state.configuration);
  const revision = useConfiguratorStore((state) => state.revision);
  const quote = useConfiguratorStore((state) => state.quote);
  const history = useRef(createConfigurationHistory());
  const [, refreshHistory] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedRoofField, setSelectedRoofField] = useState<number | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [productModelStatus, setProductModelStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('missing');
  const [saveStatus, setSaveStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });
  const [openStatus, setOpenStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });
  const [pdfStatus, setPdfStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });
  const pdfPossible = useMemo(() => evaluateConfiguration(configuration).status === 'requires_engineering_review', [configuration]);

  const applyConfiguration = (candidate: ConfigurationV1, preserveAuto = true) => {
    const current = useConfiguratorStore.getState().configuration;
    const reconciled = { ...candidate, awning: reconcileAwning(candidate) };
    const next = preserveAuto ? preserveAutomaticPostLayout(current, reconciled) : reconciled;
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

  return <ConfiguratorShell configuration={configuration} revision={revision} quote={quote}
    scene={<Suspense fallback={<p role="status">3D-Vorschau wird geladen …</p>}><PreviewViewer
      configuration={configuration} resetViewToken={resetViewToken} showDimensions={showDimensions} selectedPostId={selectedPostId} onSelectPost={setSelectedPostId}
      selectedRoofField={selectedRoofField} onSelectRoofField={setSelectedRoofField}
      onSceneStatusChange={setSceneStatus} onProductModelStatusChange={setProductModelStatus}
      onPostCentersChange={(posts) => applyConfiguration({ ...useConfiguratorStore.getState().configuration, postCenters: posts })} />
    </Suspense>}
    sceneStatus={sceneStatus} productModelStatus={productModelStatus} pdfStatus={!pdfPossible ? 'unavailable' : pdfStatus.state === 'pending' ? 'working' : 'ready'}
    pdfFeedback={pdfStatus} onCreatePdf={pdfPossible ? () => void createPdf() : undefined} arStatus="unavailable" profileArStatus="unavailable"
    saveStatus={saveStatus} openStatus={openStatus}
    onConfigurationChange={applyConfiguration} onOpenDraft={openDraft} onSaveDraft={saveDraft}
    selectedPostId={selectedPostId} onSelectPost={setSelectedPostId} selectedRoofField={selectedRoofField} onSelectRoofField={setSelectedRoofField} onUndo={history.current.canUndo() ? undo : undefined}
    onRedo={history.current.canRedo() ? redo : undefined}
    onResetView={() => setResetViewToken((value) => value + 1)}
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
