import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../domain/configuration';
import { createConfigurationHistory } from './configurationHistory';

describe('configuration history', () => {
  it('restores the exact prior product and post layout, then clears redo on a new edit', () => {
    const history = createConfigurationHistory();
    const initial = createEmptyConfiguration();
    const edited = structuredClone(initial);
    edited.productId = 'premium';
    edited.postCenters = [{ id: 'left', xMm: 500 }, { id: 'right', xMm: 4500 }];
    history.record(initial);
    const undone = history.undo(edited)!;
    expect(undone).toEqual(initial);
    expect(history.canRedo()).toBe(true);
    history.record(undone);
    expect(history.canRedo()).toBe(false);
    expect(history.canUndo()).toBe(true);
  });
});
