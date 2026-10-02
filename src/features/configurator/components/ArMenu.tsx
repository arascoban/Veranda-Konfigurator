import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { postSections, type ProductId } from '../../../catalog/catalog';
import { de } from '../../../content/de';
import type { ConfigurationV1 } from '../../../domain/configuration';
import { Modal } from '../../../ui/Modal';
import { StatusMessage } from '../../../ui/StatusMessage';

export type ProfileModelStatus = 'loading' | 'ready' | 'missing' | 'error';

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
// AR code (exporters, QR) loads only when the AR dialog opens.
const ArDialogContent = lazy(() => import('../../ar/ArExperience').then((module) => ({
  default: ({ configuration }: { configuration: ConfigurationV1 }) => module.prefersDeviceAr()
    ? <module.ArLaunchPanel configuration={configuration} /> : <module.ArQrPanel configuration={configuration} />,
})));

/**
 * "AR" over the bottom-left of the 3D view (V2, owner decision 2 Oct 2026): opens two choices — inspect and
 * compare the profiles, or see the configured terrace in AR (SW-07: real assembly; QR on the desktop, AR on
 * phones). Replaces the former "Profil im Detail ansehen" button in Konstruktion.
 */
export function ArMenu({ configuration, productId, profileStatus = 'missing', renderProfile, arReady = false }: {
  configuration: ConfigurationV1;
  productId: ProductId;
  profileStatus?: ProfileModelStatus;
  /** Isolated profile viewer of one product; mounted only while the dialog is open. */
  renderProfile: (productId: ProductId) => ReactNode;
  /** The planning is complete and valid (same condition as the PDF). */
  arReady?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);
  return (
    <div className="v2-ar" ref={rootRef}>
      {menuOpen && <div className="v2-ar__menu" role="menu" aria-label="AR und Profile">
        <button type="button" role="menuitem" className="v2-ar__option" onClick={() => { setMenuOpen(false); setCompareOpen(true); }}>
          <ProfileGlyph />
          <span className="v2-row-text"><strong>Profile im Detail ansehen</strong><small>Prime und Premium vergleichen</small></span>
        </button>
        <button type="button" role="menuitem" className="v2-ar__option" disabled={!arReady} onClick={() => { setMenuOpen(false); setArOpen(true); }}>
          <ArGlyph />
          <span className="v2-row-text"><strong>Ihre Terrasse in AR ansehen</strong>
            <small>{arReady ? 'In Originalgröße im Garten platzieren' : 'Verfügbar, sobald alle Maße und Pfosten gültig sind'}</small></span>
        </button>
      </div>}
      <button type="button" className="v2-ar__button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <ArGlyph />AR
      </button>
      <Modal open={arOpen} title="Ihre Terrasse in AR" onClose={() => setArOpen(false)}
        description="Planungsvorschau aus Ihren Bauteilen und Ihrer Ausstattung. Montagebezüge vorläufig, keine Fertigungsdarstellung.">
        {arOpen && <Suspense fallback={<p role="status">AR wird geladen …</p>}><ArDialogContent configuration={configuration} /></Suspense>}
      </Modal>
      <ProfileCompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} initialProduct={productId}
        status={profileStatus} renderProfile={renderProfile} />
    </div>
  );
}

function ProfileCompareDialog({ open, onClose, initialProduct, status, renderProfile }: {
  open: boolean; onClose: () => void; initialProduct: ProductId; status: ProfileModelStatus; renderProfile: (productId: ProductId) => ReactNode;
}) {
  const [shown, setShown] = useState<ProductId>(initialProduct);
  useEffect(() => { if (open) setShown(initialProduct); }, [open, initialProduct]);
  const message = {
    loading: { tone: 'pending' as const, title: 'Detailmodell wird geladen', text: 'Ihre Planung bleibt unverändert.' },
    ready: { tone: 'success' as const, title: 'Detailmodell geladen', text: 'Trägerprofil, ein Meter Länge.' },
    missing: { tone: 'pending' as const, title: 'Detailmodell wird vorbereitet', text: 'Das Profil wird beim Öffnen geladen.' },
    error: { tone: 'error' as const, title: 'Modell konnte nicht geladen werden', text: 'Die Konfiguration bleibt geöffnet.' },
  }[status];
  const section = (id: ProductId) => `${numberDe.format(postSections[id].alongGutterMm / 10)} × ${numberDe.format(postSections[id].towardsGardenMm / 10)} cm`;
  return (
    <Modal open={open} title="Profile im Detail" description="Trägerprofile ansehen und die Modelle vergleichen. Ihre Auswahl bleibt unverändert." onClose={onClose} size="wide">
      <div className="profile-modal-grid">
        <div className="profile-modal__model">{open ? renderProfile(shown) : null}</div>
        <div className="profile-modal__details">
          <div className="v2-segmented" role="radiogroup" aria-label="Profil anzeigen">
            {(['prime', 'premium'] as const).map((id) => (
              <button key={id} type="button" role="radio" aria-checked={shown === id} onClick={() => setShown(id)}>
                {de.products[id]}{id === initialProduct ? ' · Ihre Auswahl' : ''}
              </button>
            ))}
          </div>
          <StatusMessage tone={message.tone} title={message.title}>{message.text}</StatusMessage>
          <table className="v2-compare">
            <thead><tr><th scope="col"></th><th scope="col">Prime</th><th scope="col">Premium</th></tr></thead>
            <tbody>
              <tr><th scope="row">Pfostenquerschnitt</th><td>{section('prime')}</td><td>{section('premium')}</td></tr>
              <tr><th scope="row">Max. Pfostenabstand</th><td>400 cm</td><td>600 cm bis 600 cm Breite, sonst 400 cm</td></tr>
              <tr><th scope="row">Pfostendeckel</th><td>Gerade oder halb</td><td>Ein Pfostentyp</td></tr>
            </tbody>
          </table>
          <p className="v2-hint">Weitere Profilmaße folgen aus dem freigegebenen Modell. Prime-R Plus und Diamond Line sind in Vorbereitung.</p>
        </div>
      </div>
    </Modal>
  );
}

function ArGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M12 7.5 16 9.75v4.5L12 16.5 8 14.25v-4.5zM8 9.75l4 2.25 4-2.25M12 12v4.5" />
    </svg>
  );
}

function ProfileGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16v4H4zM7 10v8h10v-8" /><path d="M10 14h4" />
    </svg>
  );
}
