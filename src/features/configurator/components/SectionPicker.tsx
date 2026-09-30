import { de } from '../../../content/de';

export type ConfiguratorSection = keyof typeof de.sections;

/** Three directly selectable cards (Konstruktion, Dach, Ausstattung); no wizard order, no dropdown. */
export function SectionPicker({ value, onChange }: { value: ConfiguratorSection; onChange: (section: ConfiguratorSection) => void }) {
  return (
    <div className="section-cards" role="tablist" aria-label="Bereich auswählen">
      {(Object.entries(de.sections) as [ConfiguratorSection, { label: string; description: string }][]).map(([id, section]) => (
        <button key={id} type="button" role="tab" className="section-card" aria-selected={value === id}
          onClick={() => onChange(id)}>
          <span className="section-card__label">{section.label}</span>
        </button>
      ))}
    </div>
  );
}
