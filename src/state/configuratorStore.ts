import { create } from 'zustand';
import { createEmptyConfiguration, parseConfiguration, type ConfigurationV1 } from '../domain/configuration';

export type QuoteState =
  | { status: 'not_requested' }
  | { status: 'loading'; revision: number }
  | { status: 'missing_data'; revision: number }
  | { status: 'error'; revision: number }
  | { status: 'ready'; revision: number; amountMinor: number; currency: string; priceVersion: string };

type ConfiguratorState = {
  configuration: ConfigurationV1;
  revision: number;
  quote: QuoteState;
  /** Invalid imported data must not replace a valid draft. */
  replaceConfiguration: (next: ConfigurationV1) => boolean;
  requestQuote: () => number;
  acceptQuote: (revision: number, result: Exclude<QuoteState, { status: 'not_requested' | 'loading' }>) => void;
};

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  configuration: createEmptyConfiguration(),
  revision: 0,
  quote: { status: 'not_requested' },
  replaceConfiguration: (next) => {
    const parsed = parseConfiguration(next);
    if (!parsed.ok) return false;
    set((state) => ({
      // Separate the saved state from objects the caller may still mutate.
      configuration: structuredClone(parsed.configuration),
      revision: state.revision + 1,
      quote: { status: 'not_requested' },
    }));
    return true;
  },
  requestQuote: () => {
    const revision = get().revision;
    set({ quote: { status: 'loading', revision } });
    return revision;
  },
  acceptQuote: (revision, result) => {
    const state = get();
    if (revision !== state.revision || state.quote.status !== 'loading' || state.quote.revision !== revision) return;
    set({ quote: { ...result, revision } });
  },
}));
