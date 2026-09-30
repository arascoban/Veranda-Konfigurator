import type { ProductId } from '../../../catalog/catalog';
import { de } from '../../../content/de';
import { Button } from '../../../ui/Button';

export function ConfiguratorHeader({ productId, onProductChange, onOpen, onSave, canOpen = true, canSave = true }: {
  productId: ProductId;
  onProductChange: (productId: ProductId) => void;
  onOpen?: () => void;
  onSave?: () => void;
  canOpen?: boolean;
  canSave?: boolean;
}) {
  return (
    <header className="configurator-header glass-surface">
      <div className="configurator-header__brand">{de.brand}</div>
      <div className="configurator-header__product product-switch" role="group" aria-label="Produkt auswählen">
        {(Object.keys(de.products) as ProductId[]).map((id) => (
          <button key={id} type="button" className="product-switch__option" aria-pressed={productId === id}
            onClick={() => onProductChange(id)}>{de.products[id]}</button>
        ))}
      </div>
      <div className="configurator-header__actions">
        <Button icon="open" onClick={onOpen} disabled={!onOpen || !canOpen}>Öffnen</Button>
        <Button icon="save" variant="primary" onClick={onSave} disabled={!onSave || !canSave}>Speichern</Button>
      </div>
    </header>
  );
}
