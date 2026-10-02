import { useEffect, useMemo, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import type { Object3D } from 'three';
import { de } from '../../content/de';
import type { ConfigurationV1 } from '../../domain/configuration';
import { PartLibrary } from '../assembly/assemblyScene';
import { createArLink } from './arLink';
import { detectArSupport, openQuickLook, startWebXrAr, type ArSupport } from './arLaunch';
import { buildArGroup, exportAssemblyModel } from './exportAssemblyModel';

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

export function arTitle(configuration: ConfigurationV1): string {
  const { width, depth } = configuration.dimensionsMm;
  const size = width !== null && depth !== null ? ` ${numberDe.format(width / 10)} × ${numberDe.format(depth / 10)} cm` : '';
  return `Terrassenüberdachung ${de.products[configuration.productId]}${size}`;
}

/** Phones and tablets get the AR button directly; desktops get the QR code. */
export function prefersDeviceAr(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

type Prepared =
  | { state: 'preparing' }
  | { state: 'quicklook'; usdz: Blob }
  | { state: 'webxr'; model: Object3D }
  | { state: 'unsupported' }
  | { state: 'error' };

/**
 * "In AR ansehen" on the device itself (SW-07): prepares the real assembly for Quick Look (USDZ) or WebXR before
 * the tap, so the tap can start AR directly (browsers require the user gesture).
 */
export function ArLaunchPanel({ configuration }: { configuration: ConfigurationV1 }) {
  const [prepared, setPrepared] = useState<Prepared>({ state: 'preparing' });
  const [inSession, setInSession] = useState(false);
  const [placed, setPlaced] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<(() => void) | null>(null);
  const library = useMemo(() => new PartLibrary(import.meta.env.BASE_URL), []);
  const title = arTitle(configuration);

  useEffect(() => {
    let cancelled = false;
    setPrepared({ state: 'preparing' });
    void (async () => {
      try {
        const support: ArSupport = await detectArSupport();
        if (support.quickLook) {
          const result = await exportAssemblyModel(configuration, 'usdz', library);
          if (!cancelled) setPrepared(result.status === 'ready' ? { state: 'quicklook', usdz: result.blob } : { state: 'error' });
        } else if (support.webXr) {
          const model = await buildArGroup(configuration, library);
          if (!cancelled) setPrepared(model ? { state: 'webxr', model } : { state: 'error' });
        } else if (!cancelled) setPrepared({ state: 'unsupported' });
      } catch {
        if (!cancelled) setPrepared({ state: 'error' });
      }
    })();
    return () => { cancelled = true; endRef.current?.(); };
  }, [configuration, library]);

  const start = () => {
    if (prepared.state === 'quicklook') openQuickLook(prepared.usdz, title);
    else if (prepared.state === 'webxr' && overlayRef.current) {
      setPlaced(false);
      startWebXrAr(prepared.model, overlayRef.current, {
        onStarted: (end) => { endRef.current = end; setInSession(true); },
        onPlaced: () => setPlaced(true),
      }).catch(() => setPrepared({ state: 'error' })).finally(() => { endRef.current = null; setInSession(false); });
    }
  };

  return (
    <div className="ar-launch">
      <button type="button" className="v2-primary-button ar-launch__button" onClick={start}
        disabled={prepared.state !== 'quicklook' && prepared.state !== 'webxr'}>
        {prepared.state === 'preparing' ? 'AR-Modell wird vorbereitet …' : 'In AR ansehen'}
      </button>
      <p className="v2-hint">
        {prepared.state === 'quicklook' ? 'Öffnet die AR-Ansicht von iOS. Das Modell erscheint in Originalgröße.'
          : prepared.state === 'webxr' ? 'Kamera auf den Boden richten, warten bis der blaue Ring erscheint, dann tippen. Ein weiteres Tippen versetzt das Modell.'
            : prepared.state === 'unsupported' ? 'Dieses Gerät oder dieser Browser unterstützt keine AR-Ansicht. Die 3D-Ansicht bleibt verfügbar.'
              : prepared.state === 'error' ? 'Das AR-Modell konnte nicht erstellt werden. Bitte später erneut versuchen.'
                : 'Das Modell wird aus Ihren Bauteilen erstellt.'}
      </p>
      {/* Shown over the camera image during a WebXR session (DOM overlay). */}
      <div ref={overlayRef} className={`ar-overlay ${inSession ? 'ar-overlay--active' : ''}`}>
        {inSession && <>
          <span className="ar-overlay__hint">{placed ? 'Tippen, um das Modell zu versetzen' : 'Boden suchen … dann tippen'}</span>
          <button type="button" className="ar-overlay__close" onClick={() => endRef.current?.()}>AR beenden</button>
        </>}
      </div>
    </div>
  );
}

/** Desktop: QR with the AR link of this exact planning; scanned on a phone it opens the AR page. */
export function ArQrPanel({ configuration }: { configuration: ConfigurationV1 }) {
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLink(null);
    createArLink(configuration, window.location.href)
      .then((value) => { if (!cancelled) setLink(value); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [configuration]);
  const svg = useMemo(() => {
    if (!link) return '';
    const code = qrcode(0, 'L');
    code.addData(link, 'Byte');
    code.make();
    return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [link]);
  const local = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  return (
    <div className="ar-qr">
      <div className="ar-qr__code" role="img" aria-label="QR-Code für die AR-Ansicht">
        {/* Generated by qrcode-generator from our own link; no user markup is inserted. */}
        {svg ? <span dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="v2-hint">{failed ? 'QR-Code nicht verfügbar.' : 'QR-Code wird erstellt …'}</span>}
      </div>
      <div className="ar-qr__text">
        <h3>Mit dem Smartphone scannen</h3>
        <p>Der Code öffnet genau diese Planung auf Ihrem Telefon. Dort „In AR ansehen“ tippen und die Überdachung in Originalgröße in den Garten stellen.</p>
        <p className="v2-hint">iPhone und iPad: AR-Ansicht von iOS. Android: Chrome mit ARCore. Ändern Sie die Planung, entsteht ein neuer Code.</p>
        {local && <p className="v2-error-text">Hinweis: Diese Seite läuft lokal ({window.location.host}); ein Telefon kann die Adresse nicht öffnen. Der Code funktioniert auf der veröffentlichten HTTPS-Seite.</p>}
        {link && <button type="button" className="v2-secondary-button" onClick={() => {
          void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false));
        }}>{copied ? 'Link kopiert' : 'Link kopieren'}</button>}
      </div>
    </div>
  );
}
