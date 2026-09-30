import { useConfiguratorStore } from '../../state/configuratorStore';
import { loadLocalDraft, saveLocalDraft, type DraftStorage, type LoadDraftResult } from '../../services/configurations/localDraft';

/** Local-only draft actions. A local draft has no shareable link or server identity. */
export function saveCurrentDraft(storage: DraftStorage): ReturnType<typeof saveLocalDraft> {
  return saveLocalDraft(storage, useConfiguratorStore.getState().configuration);
}

export function restoreCurrentDraft(storage: DraftStorage): LoadDraftResult {
  const result = loadLocalDraft(storage);
  if (result.status === 'loaded' && !useConfiguratorStore.getState().replaceConfiguration(result.configuration)) {
    return { status: 'corrupt' };
  }
  return result;
}
