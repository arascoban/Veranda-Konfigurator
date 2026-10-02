import { lazy, Suspense, useState } from 'react';
import { AR_LINK_PARAM } from '../features/ar/arLink';
import { useConfiguratorStore } from '../state/configuratorStore';
import { ConfiguratorApp } from './ConfiguratorApp';

// Keep the import itself inside the compile-time development branch.
const PreviewRoute = import.meta.env.DEV
  ? lazy(() => import('./PreviewRoute').then(({ PreviewRoute: Component }) => ({ default: Component })))
  : null;
// AR page opened from the desktop QR (SW-07); loaded only for such links.
const ArEntryPage = lazy(() => import('../features/ar/ArEntryPage').then(({ ArEntryPage: Component }) => ({ default: Component })));

export function App() {
  const [arPayload, setArPayload] = useState(() => new URLSearchParams(window.location.search).get(AR_LINK_PARAM));
  if (PreviewRoute && new URLSearchParams(window.location.search).has('preview')) {
    return <Suspense fallback={<p>Vorschau wird geladen …</p>}><PreviewRoute /></Suspense>;
  }
  if (arPayload) {
    return <Suspense fallback={<p role="status">Planung wird geöffnet …</p>}>
      <ArEntryPage payload={arPayload} onOpenConfigurator={(configuration) => {
        // The link's planning becomes the working draft; the address loses the AR parameter.
        useConfiguratorStore.getState().replaceConfiguration(configuration);
        const url = new URL(window.location.href);
        url.searchParams.delete(AR_LINK_PARAM);
        window.history.replaceState(null, '', url);
        setArPayload(null);
      }} />
    </Suspense>;
  }
  return <ConfiguratorApp />;
}
