import { describe, expect, it } from 'vitest';
import { createEmptyConfiguration } from '../domain/configuration';
import { useConfiguratorStore } from './configuratorStore';

describe('quote revision ownership', () => {
  it('does not show an old response after a configuration change', () => {
    const store = useConfiguratorStore;
    const oldRevision = store.getState().requestQuote();
    store.getState().replaceConfiguration({ ...createEmptyConfiguration(), productId: 'premium' });
    store.getState().acceptQuote(oldRevision, {
      status: 'ready', revision: oldRevision, amountMinor: 99900, currency: 'EUR', priceVersion: 'old',
    });
    expect(store.getState().quote.status).toBe('not_requested');
  });

  it('keeps a saved Premium selection and rejects later mutation of the supplied draft', () => {
    const draft = { ...createEmptyConfiguration(), productId: 'premium' as const };
    expect(useConfiguratorStore.getState().replaceConfiguration(draft)).toBe(true);
    const savedRevision = useConfiguratorStore.getState().revision;
    draft.dimensionsMm.width = 5000;
    expect(useConfiguratorStore.getState().configuration.productId).toBe('premium');
    expect(useConfiguratorStore.getState().configuration.dimensionsMm.width).toBeNull();
    expect(useConfiguratorStore.getState().revision).toBe(savedRevision);
  });

  it('does not replace a draft or its quote with an unsupported imported product', () => {
    const before = useConfiguratorStore.getState();
    const unsupported = { ...createEmptyConfiguration(), productId: 'unknown' };
    expect(useConfiguratorStore.getState().replaceConfiguration(unsupported as never)).toBe(false);
    expect(useConfiguratorStore.getState().revision).toBe(before.revision);
    expect(useConfiguratorStore.getState().configuration).toEqual(before.configuration);
  });
});
