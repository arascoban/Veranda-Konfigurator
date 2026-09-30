import { Icon } from '../../../ui/Icon';

export function ScenePlaceholder({ status }: { status: 'loading' | 'ready' | 'missing' | 'error' }) {
  const message = {
    loading: ['Modell wird geladen', 'Ihre Maße bleiben erhalten.'],
    ready: ['3D-Ansicht wird verbunden', 'Die Modellansicht erscheint an dieser Stelle.'],
    missing: ['Modell noch nicht verfügbar', 'Die Konfiguration kann weiterhin bearbeitet werden.'],
    error: ['3D-Ansicht konnte nicht geladen werden', 'Bitte versuchen Sie es erneut oder bearbeiten Sie die Maße im linken Bereich.'],
  }[status];
  return <div className="scene-placeholder"><div className="scene-placeholder__inner">
    <span className="scene-placeholder__icon"><Icon name="roof" /></span>
    <strong>{message[0]}</strong><p>{message[1]}</p>
  </div></div>;
}
