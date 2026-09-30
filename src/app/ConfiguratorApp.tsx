import { lazy, Suspense, useRef, useState } from 'react';
import type { ConfigurationV1 } from '../domain/configuration';
import { MAX_WIDTH_MM } from '../catalog/catalog';
import { ConfiguratorShell, type ConfiguratorActionStatus } from '../features/configurator';
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
  const [editPosts, setEditPosts] = useState(false);
  const [resetViewToken, setResetViewToken] = useState(0);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [saveStatus, setSaveStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });
  const [openStatus, setOpenStatus] = useState<ConfiguratorActionStatus>({ state: 'idle' });

  const applyConfiguration = (candidate: ConfigurationV1, preserveAuto = true) => {
    const current = useConfiguratorStore.getState().configuration;
    const next = preserveAuto ? preserveAutomaticPostLayout(current, candidate) : candidate;
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
  const editPostsInScene = () => {
    setEditPosts(true);
    if (window.innerWidth < 768) window.requestAnimationFrame(() =>
      document.querySelector('[aria-label="3D-Vorschau"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return <ConfiguratorShell configuration={configuration} revision={revision} quote={quote}
    scene={<Suspense fallback={<p role="status">3D-Vorschau wird geladen …</p>}><PreviewViewer
      configuration={configuration} editPosts={editPosts} resetViewToken={resetViewToken}
      onSceneStatusChange={setSceneStatus}
      onPostCentersChange={(posts) => applyConfiguration({ ...useConfiguratorStore.getState().configuration, postCenters: posts })} />
    </Suspense>}
    sceneStatus={sceneStatus} productModelStatus="missing" pdfStatus="unavailable" arStatus="unavailable" profileArStatus="unavailable"
    saveStatus={saveStatus} openStatus={openStatus}
    onConfigurationChange={applyConfiguration} onOpenDraft={openDraft} onSaveDraft={saveDraft}
    onEditPosts={editPostsInScene} onUndo={history.current.canUndo() ? undo : undefined}
    onRedo={history.current.canRedo() ? redo : undefined}
    onResetView={() => setResetViewToken((value) => value + 1)} />;
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
