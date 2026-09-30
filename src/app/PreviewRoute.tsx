import { createEmptyConfiguration } from '../domain/configuration';
import { PreviewViewer } from '../features/viewer/PreviewViewer';

const example = createEmptyConfiguration();
example.dimensionsMm = { width: 5000, depth: 3000, rearHeight: 2700, frontHeight: 2400 };
example.postCenters = [{ id: 'left', xMm: 500 }, { id: 'right', xMm: 4500 }];

/** Development-only visual check; never presented as a customer configuration. */
export function PreviewRoute() {
  return (
    <main style={{ maxWidth: 1100, margin: '32px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Interne 3D-Vorschau</h1>
      <p>Testmaße: 500 × 300 cm. Profile, Verbindungen und Dachneigung sind noch nicht freigegeben.</p>
      <div style={{ height: 'min(65vh, 660px)', minHeight: 360, borderRadius: 18, overflow: 'hidden' }}>
        <PreviewViewer configuration={example} />
      </div>
    </main>
  );
}
