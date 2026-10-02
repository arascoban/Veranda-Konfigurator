import { lazy, Suspense, useEffect, useState } from 'react';
import { de } from '../../content/de';
import type { ConfigurationV1 } from '../../domain/configuration';
import { fieldEquipmentSummaryDe } from '../../domain/fieldEquipment';
import { roofSummaryDe } from '../../domain/roofSummary';
import { ArLaunchPanel, arTitle } from './ArExperience';
import { decodeArPayload, type ArLinkDecode } from './arLink';
import '../configurator/v2.css';
import '../../styles/global.css';
import '../../ui/ui.css';

const PreviewViewer = lazy(() => import('../viewer/PreviewViewer').then(({ PreviewViewer: Component }) => ({ default: Component })));
const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/**
 * Page opened from the desktop QR (`?ar=…`, SW-07): shows the planning from the link, a look-only 3D view and
 * the AR button. Nothing is saved; "Im Konfigurator öffnen" hands the planning to the normal configurator.
 */
export function ArEntryPage({ payload, onOpenConfigurator }: { payload: string; onOpenConfigurator: (configuration: ConfigurationV1) => void }) {
  const [decoded, setDecoded] = useState<ArLinkDecode | null>(null);
  useEffect(() => { let cancelled = false; void decodeArPayload(payload).then((result) => { if (!cancelled) setDecoded(result); }); return () => { cancelled = true; }; }, [payload]);

  if (!decoded) return <main className="ar-page"><p role="status">Planung wird geöffnet …</p></main>;
  if (decoded.status !== 'ok') {
    return (
      <main className="ar-page">
        <Brand />
        <section className="v2-card ar-page__card">
          <h1>Link nicht lesbar</h1>
          <p>{decoded.status === 'unsupported_version' ? 'Dieser Link stammt aus einer anderen Version des Konfigurators.'
            : 'Der Link ist unvollständig oder beschädigt. Bitte den QR-Code erneut scannen.'}</p>
          <a className="v2-primary-button ar-page__link" href={window.location.pathname}>Zum Konfigurator</a>
        </section>
      </main>
    );
  }
  const configuration = decoded.configuration;
  const { width, depth, frontHeight } = configuration.dimensionsMm;
  const roof = roofSummaryDe(configuration);
  const equipment = fieldEquipmentSummaryDe(configuration);
  return (
    <main className="ar-page">
      <Brand />
      <section className="ar-page__viewer" aria-label="3D-Ansicht">
        <Suspense fallback={<p role="status">3D-Ansicht wird geladen …</p>}>
          <PreviewViewer configuration={configuration} interactive={false} />
        </Suspense>
      </section>
      <section className="v2-card ar-page__card">
        <h1>{arTitle(configuration)}</h1>
        <dl className="ar-page__facts">
          <div><dt>Modell</dt><dd>{de.products[configuration.productId]} · {de.roofMaterials[configuration.roofMaterialId]}</dd></div>
          {width !== null && depth !== null && <div><dt>Maße</dt><dd>{numberDe.format(width / 10)} × {numberDe.format(depth / 10)} cm{frontHeight !== null ? `, Höhe vorne ${numberDe.format(frontHeight / 10)} cm` : ''}</dd></div>}
          <div><dt>Dach</dt><dd>{roof.finish}</dd></div>
          {equipment.length > 0 && <div><dt>Ausstattung</dt><dd>{equipment.map((row) => `${row.label}: ${row.value}`).join(' · ')}</dd></div>}
        </dl>
        <ArLaunchPanel configuration={configuration} />
        <p className="v2-hint">Planungsvorschau aus Ihren Bauteilen. Montagebezüge vorläufig, Ausstattung schematisch, keine Fertigungsdarstellung und kein Angebot.</p>
        <button type="button" className="v2-secondary-button" onClick={() => onOpenConfigurator(configuration)}>Im Konfigurator öffnen</button>
      </section>
    </main>
  );
}

function Brand() {
  return <img className="ar-page__logo" src={`${import.meta.env.BASE_URL}images/brand/eg-veranda-logo.avif`} alt="EG Veranda Hamburg GmbH" />;
}
