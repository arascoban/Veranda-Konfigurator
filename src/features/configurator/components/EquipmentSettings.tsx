import { useEffect, useMemo, useState } from 'react';
import type { ConfigurationV1 } from '../../../domain/configuration';
import {
  applyKindToFields, canPlace, elementNameDe, equipmentKinds, hasKind, listFields, type EquipmentKind,
} from '../../../domain/fieldEquipment';
import { useNoticeStore } from '../../../state/noticeStore';
import { EquipmentIcon } from '../../../ui/EquipmentIcon';

/** Card labels with soft hyphens, so the narrow cards break at word joints. */
const cardNames: Record<EquipmentKind, string> = {
  glasschiebewand: 'Glasschiebe\u00adwand', aluminiumwand: 'Aluminium\u00adwand', seitenwand_licht: 'Seitenwand licht\u00addurchlässig',
  senkrechtmarkise: 'Senkrecht\u00admarkise', giebeldreieck: 'Giebel\u00addreieck',
};

/**
 * Ausstattung first (V2): pick an element, tick the fields in the checklist (the model tints them blue),
 * then apply. Fields that cannot take the element are shown with the reason and cannot be ticked.
 */
export function EquipmentSettings({ configuration, onChange, onHighlightFields }: {
  configuration: ConfigurationV1;
  onChange: (next: ConfigurationV1) => void;
  onHighlightFields: (fieldIds: string[]) => void;
}) {
  const [kind, setKind] = useState<EquipmentKind | null>(null);
  const fields = useMemo(() => listFields(configuration)
    .filter((field) => kind !== 'giebeldreieck' || field.kind === 'side'), [configuration, kind]);
  const current = useMemo(() => kind ? fields.filter((field) => hasKind(configuration, field.id, kind)).map((field) => field.id) : [],
    [configuration, fields, kind]);
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => { setChecked(current); }, [current.join(',')]);
  useEffect(() => { onHighlightFields(kind ? checked : []); }, [kind, checked.join(',')]);
  useEffect(() => () => onHighlightFields([]), []);
  const pushNotice = useNoticeStore((state) => state.push);
  const changed = checked.length !== current.length || checked.some((id) => !current.includes(id));

  const apply = () => {
    if (!kind) return;
    const result = applyKindToFields(configuration, kind, checked);
    if (result.rejected.length) {
      const labels = fields.filter((field) => result.rejected.includes(field.id)).map((field) => field.label);
      pushNotice({ title: `${elementNameDe[kind]} nicht möglich`, message: `In ${labels.join(', ')} ist kein Platz mehr (höchstens 2 Elemente je Feld).` });
    }
    onChange(result.configuration);
  };

  return (
    <div className="v2-equipment">
      <div className="v2-kind-grid" role="radiogroup" aria-label="Element wählen">
        {equipmentKinds.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={kind === option} className="v2-kind-card"
            onClick={() => setKind(kind === option ? null : option)}>
            <span className="v2-kind-card__picture" aria-hidden="true"><EquipmentIcon kind={option} /></span>
            <span className="v2-kind-card__name">{cardNames[option]}</span>
            {kind === option && <span className="v2-kind-card__check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      {!kind && <p className="v2-hint">Element wählen, dann die Felder festlegen. Oder ein Feld im Modell antippen und die Ausstattung im Kreismenü wählen.</p>}
      {kind && <>
        <div className="v2-subhead"><h3>Felder für {elementNameDe[kind]}</h3><span>{checked.length} gewählt</span></div>
        {!fields.length && <p className="v2-hint">Bitte zuerst gültige Maße und Pfosten festlegen.</p>}
        <div className="v2-checklist">
          {fields.map((field) => {
            const isChecked = checked.includes(field.id);
            const check = canPlace(configuration, field, kind);
            const blocked = !isChecked && !check.ok && check.reason !== 'already_present';
            const reason = blocked ? check.ok ? '' : check.reason === 'field_full' ? 'Feld voll (2 Elemente)' : check.reason === 'side_only' ? 'Nur seitlich' : 'Feld zu niedrig' : '';
            return (
              <label key={field.id} className={`v2-check-row ${isChecked ? 'v2-check-row--on' : ''} ${blocked ? 'v2-check-row--blocked' : ''}`}>
                <input type="checkbox" checked={isChecked} disabled={blocked}
                  onChange={() => setChecked(isChecked ? checked.filter((id) => id !== field.id) : [...checked, field.id])} />
                <span className="v2-check-row__box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                </span>
                <span className="v2-row-text"><strong>{field.label}</strong><small>{reason || field.detail}</small></span>
              </label>
            );
          })}
        </div>
        <button type="button" className="v2-primary-button" disabled={!changed} onClick={apply}>
          {checked.length ? `Auf ${checked.length} ${checked.length === 1 ? 'Feld' : 'Felder'} anwenden` : 'Aus allen Feldern entfernen'}
        </button>
      </>}
    </div>
  );
}
