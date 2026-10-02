import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Figtree (V2 font), bundled locally: no request to an external font service.
import '@fontsource-variable/figtree';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';

const host = document.getElementById('root');
if (!host) throw new Error('Root element missing');

createRoot(host).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
