import type { ChangeEvent } from 'react';
import { de } from '../../../content/de';
import { Icon } from '../../../ui/Icon';

export type ConfiguratorSection = keyof typeof de.sections;

export function SectionPicker({ value, onChange }: { value: ConfiguratorSection; onChange: (section: ConfiguratorSection) => void }) {
  const choose = (event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value as ConfiguratorSection);
  return (
    <div className="section-picker">
      <label className="section-picker__label" htmlFor="configurator-section">Bereich auswählen</label>
      <div className="section-picker__control">
        <select id="configurator-section" className="section-picker__select" value={value} onChange={choose}>
          {Object.entries(de.sections).map(([id, section]) => <option key={id} value={id}>{section.label}</option>)}
        </select>
        <Icon className="ui-icon" name="chevron-down" />
      </div>
    </div>
  );
}
