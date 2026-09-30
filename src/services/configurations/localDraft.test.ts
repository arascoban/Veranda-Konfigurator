import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../../domain/configuration';
import { useConfiguratorStore } from '../../state/configuratorStore';
import { restoreCurrentDraft, saveCurrentDraft } from '../../features/save/draftActions';
import { LOCAL_DRAFT_KEY, loadLocalDraft, saveLocalDraft, type DraftStorage } from './localDraft';

function memoryStorage(): DraftStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('local draft without a share link', () => {
  it('restores the selected Premium product after a new in-memory session state', () => {
    const storage = memoryStorage();
    const premium = { ...createEmptyConfiguration(), productId: 'premium' as const };
    expect(useConfiguratorStore.getState().replaceConfiguration(premium)).toBe(true);
    expect(saveCurrentDraft(storage)).toBe('saved');
    expect(useConfiguratorStore.getState().replaceConfiguration(createEmptyConfiguration())).toBe(true);
    expect(restoreCurrentDraft(storage)).toMatchObject({ status: 'loaded', configuration: { productId: 'premium' } });
    expect(useConfiguratorStore.getState().configuration.productId).toBe('premium');
  });

  it('keeps malformed and older saved data distinct and does not overwrite the current draft', () => {
    const storage = memoryStorage();
    const before = useConfiguratorStore.getState().configuration;
    storage.setItem(LOCAL_DRAFT_KEY, '{broken');
    expect(restoreCurrentDraft(storage)).toEqual({ status: 'corrupt' });
    expect(useConfiguratorStore.getState().configuration).toEqual(before);
    storage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({ ...createEmptyConfiguration(), schemaVersion: 0 }));
    expect(loadLocalDraft(storage)).toEqual({ status: 'unsupported_version' });
    expect(useConfiguratorStore.getState().configuration).toEqual(before);
  });

  it('does not save an unsupported product or erase existing content', () => {
    const storage = memoryStorage();
    storage.setItem(LOCAL_DRAFT_KEY, 'original');
    expect(saveLocalDraft(storage, { ...createEmptyConfiguration(), productId: 'other' } as never)).toBe('invalid');
    expect(storage.getItem(LOCAL_DRAFT_KEY)).toBe('original');
  });

  it('reports unavailable browser storage instead of claiming a saved draft', () => {
    const unavailable: DraftStorage = {
      getItem: () => { throw new Error('private mode'); },
      setItem: () => { throw new Error('private mode'); },
      removeItem: () => { throw new Error('private mode'); },
    };
    expect(loadLocalDraft(unavailable)).toEqual({ status: 'storage_error' });
    expect(saveLocalDraft(unavailable, createEmptyConfiguration())).toBe('storage_error');
  });
});
