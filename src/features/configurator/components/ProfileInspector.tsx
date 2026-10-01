import { useState, type ReactNode } from 'react';
import type { ProductId } from '../../../catalog/catalog';
import { de } from '../../../content/de';
import { Button } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
import { Modal } from '../../../ui/Modal';
import { StatusMessage } from '../../../ui/StatusMessage';

export type ProductModelStatus = 'loading' | 'ready' | 'missing' | 'error';

export function ProfileInspector({ productId, modelStatus = 'missing', profileModel, arReady = false, onShowAr }: {
  productId: ProductId;
  modelStatus?: ProductModelStatus;
  profileModel?: ReactNode;
  arReady?: boolean;
  onShowAr?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const status = {
    loading: { tone: 'pending' as const, title: 'Detailmodell wird geladen', text: 'Ihre ausgewählte Produktvariante bleibt aktiv.' },
    ready: { tone: 'success' as const, title: 'Detailmodell geladen', text: 'Trägerprofil des gewählten Produkts, ein Meter Länge.' },
    missing: { tone: 'pending' as const, title: 'Detailmodell wird vorbereitet', text: 'Das Profil wird beim Öffnen geladen.' },
    error: { tone: 'error' as const, title: 'Modell konnte nicht geladen werden', text: 'Die normale Konfiguration bleibt geöffnet.' },
  }[modelStatus];
  return <>
    <Button variant="secondary" icon="external" onClick={() => setOpen(true)}>Profil im Detail ansehen</Button>
    <Modal open={open} title="Trägerprofil im Detail" description="Das Einzelteil passend zum ausgewählten Produkt ansehen."
      onClose={() => setOpen(false)} size="wide">
      <div className="profile-modal-grid">
        <div className="profile-modal__model">
          {open && profileModel ? profileModel : <div className="profile-modal__placeholder">
            <div className="profile-modal__beam" aria-hidden="true" />
            <p>Einzelmodell wird hier angezeigt, sobald es geladen ist.</p>
          </div>}
        </div>
        <div className="profile-modal__details">
          <p className="eyebrow">Ausgewähltes Produkt</p>
          <h3>{de.products[productId]}</h3>
          <p>Trägerprofil · passende Modellstufe</p>
          <StatusMessage tone={status.tone} title={status.title}>{status.text}</StatusMessage>
          <p>Profilmaße und technische Angaben werden aus dem freigegebenen Modell übernommen.</p>
          <Button variant="primary" icon="external" disabled={!arReady || !onShowAr} onClick={onShowAr}>
            Auf meinem Tisch ansehen
          </Button>
          {!arReady && <p>AR-Vorschau ist für dieses Modell noch nicht verfügbar.</p>}
        </div>
      </div>
      <p className="profile-modal__product-note"><Icon name="info" /> Prime und Premium sind getrennte Produkte. Beim Produktwechsel wird nur das passende Modell geladen.</p>
    </Modal>
  </>;
}
