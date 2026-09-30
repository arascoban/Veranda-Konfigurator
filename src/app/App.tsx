import { lazy, Suspense } from 'react';
import { ConfiguratorApp } from './ConfiguratorApp';

// Keep the import itself inside the compile-time development branch.
const PreviewRoute = import.meta.env.DEV
  ? lazy(() => import('./PreviewRoute').then(({ PreviewRoute: Component }) => ({ default: Component })))
  : null;

export function App() {
  if (PreviewRoute && new URLSearchParams(window.location.search).has('preview')) {
    return <Suspense fallback={<p>Vorschau wird geladen …</p>}><PreviewRoute /></Suspense>;
  }
  return <ConfiguratorApp />;
}
