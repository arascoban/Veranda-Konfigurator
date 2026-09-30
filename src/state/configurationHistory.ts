import type { ConfigurationV1 } from '../domain/configuration';

/** Browser-session undo stack; saved drafts remain a separate explicit action. */
export function createConfigurationHistory() {
  const past: ConfigurationV1[] = [];
  const future: ConfigurationV1[] = [];
  return {
    record(previous: ConfigurationV1) {
      past.push(structuredClone(previous));
      future.length = 0;
    },
    undo(current: ConfigurationV1): ConfigurationV1 | null {
      const previous = past.pop();
      if (!previous) return null;
      future.push(structuredClone(current));
      return structuredClone(previous);
    },
    redo(current: ConfigurationV1): ConfigurationV1 | null {
      const next = future.pop();
      if (!next) return null;
      past.push(structuredClone(current));
      return structuredClone(next);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
