import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

/**
 * Heading with a picture placeholder on the left (the real pictograms follow from the user), an optional
 * chip and an "i" explanation. Also carries the "+ / ✓ / Entfernen" control of an add-on.
 */
export function SectionHead({ title, chip, info, picture = 'placeholder', action }: {
  title: string; chip?: string; info?: string; picture?: string; action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <span className={`section-head__picture section-head__picture--${picture}`} aria-hidden="true" />
      <div className="section-head__text">
        <h3 className="section-subheading section-head__title">{title}{info && <InfoTip text={info} />}</h3>
        {chip && <span className="section-head__chip">{chip}</span>}
      </div>
      {action}
    </div>
  );
}

/** "+" that becomes a green check once the add-on is active (reference design, 1 Oct 2026). */
export function AddOnToggle({ active, label, onAdd }: { active: boolean; label: string; onAdd: () => void }) {
  return (
    <button type="button" className={`addon-toggle ${active ? 'addon-toggle--active' : ''}`} aria-pressed={active}
      aria-label={active ? `${label} ausgewählt` : `${label} hinzufügen`} onClick={() => { if (!active) onAdd(); }}>
      {active ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>}
    </button>
  );
}
