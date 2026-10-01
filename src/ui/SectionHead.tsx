import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';

/**
 * Heading with an optional picture on the left, a chip and an "i" explanation. `action` carries the
 * "+ / ✓" control of an add-on or a collapse button.
 */
export function SectionHead({ title, chip, info, picture, action }: {
  title: string; chip?: string; info?: string; picture?: string; action?: ReactNode;
}) {
  return (
    <div className={`section-head ${picture ? '' : 'section-head--no-picture'}`}>
      {picture && <img className="section-head__picture" src={`${import.meta.env.BASE_URL}images/sections/${picture}`} alt="" />}
      <div className="section-head__text">
        <h3 className="section-subheading section-head__title">{title}{info && <InfoTip text={info} />}</h3>
        {chip && <span className="section-head__chip">{chip}</span>}
      </div>
      {action}
    </div>
  );
}

/** "+" that becomes a green check once the add-on is active; pressing the check again removes it. */
export function AddOnToggle({ active, label, onAdd, onRemove }: { active: boolean; label: string; onAdd: () => void; onRemove: () => void }) {
  return (
    <button type="button" className={`addon-toggle ${active ? 'addon-toggle--active' : ''}`} aria-pressed={active}
      aria-label={active ? `${label} entfernen` : `${label} hinzufügen`} title={active ? 'Entfernen' : 'Hinzufügen'}
      onClick={() => (active ? onRemove() : onAdd())}>
      {active ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>}
    </button>
  );
}

/** Chevron that opens/closes a list under a heading. */
export function CollapseToggle({ open, label, onToggle }: { open: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" className={`collapse-toggle ${open ? 'collapse-toggle--open' : ''}`} aria-expanded={open} aria-label={label} onClick={onToggle}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  );
}
