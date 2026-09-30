import { parseConfiguration, type ConfigurationV1 } from '../../domain/configuration';

export const LOCAL_DRAFT_KEY = 'veranda.draft.v1';

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadDraftResult =
  | { status: 'empty' }
  | { status: 'loaded'; configuration: ConfigurationV1 }
  | { status: 'unsupported_version' | 'corrupt' | 'storage_error' };

export function saveLocalDraft(storage: DraftStorage, configuration: ConfigurationV1): 'saved' | 'invalid' | 'storage_error' {
  const parsed = parseConfiguration(configuration);
  if (!parsed.ok) return 'invalid';
  try {
    storage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(parsed.configuration));
    return 'saved';
  } catch {
    return 'storage_error';
  }
}

export function loadLocalDraft(storage: DraftStorage): LoadDraftResult {
  let raw: string | null;
  try {
    raw = storage.getItem(LOCAL_DRAFT_KEY);
  } catch {
    return { status: 'storage_error' };
  }
  if (raw === null) return { status: 'empty' };
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { status: 'corrupt' };
  }
  const parsed = parseConfiguration(candidate);
  if (!parsed.ok) return { status: parsed.reason === 'unsupported_version' ? 'unsupported_version' : 'corrupt' };
  return { status: 'loaded', configuration: parsed.configuration };
}

export function clearLocalDraft(storage: DraftStorage): 'cleared' | 'storage_error' {
  try {
    storage.removeItem(LOCAL_DRAFT_KEY);
    return 'cleared';
  } catch {
    return 'storage_error';
  }
}
