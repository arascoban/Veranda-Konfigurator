import { useRef, useState } from 'react';
import { frameColors } from '../../../catalog/catalog';
import type { ConfigurationV1 } from '../../../domain/configuration';
import {
  addToField, canPlace, elementNameDe, equipmentFor, fieldElementTypes, glassToneDe, glassTones, listFields, MIN_SPLIT_PART_MM,
  openingDirectionDe, openingDirections, removeFromField, setLowerHeight, splitRange, swapElements, updateElement,
  type EquipmentKind, type FieldDescriptor, type FieldElement,
} from '../../../domain/fieldEquipment';
import { EquipmentIcon } from '../../../ui/EquipmentIcon';
import { InfoTip } from '../../../ui/InfoTip';
import { DimensionField } from './DimensionField';

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const cm = (mm: number) => numberDe.format(mm / 10);
const glassSwatch = { klar: 'rgba(211,228,238,.8)', getoent: 'rgba(63,71,77,.6)', satiniert: '#EEF1F0' } as const;

/** Feld section (V2): list of front and side fields, or the detail of the selected field. */
export function FieldSettings({ configuration, onChange, selectedFieldId, onSelectField }: {
  configuration: ConfigurationV1;
  onChange: (next: ConfigurationV1) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
}) {
  const fields = listFields(configuration);
  const selected = fields.find((field) => field.id === selectedFieldId);
  if (selected) return <FieldDetail configuration={configuration} field={selected} onChange={onChange} onBack={() => onSelectField(null)} />;
  if (!fields.length) return <p className="v2-hint">Bitte zuerst gültige Maße festlegen.</p>;
  const groups = [
    { title: 'Vorne', rows: fields.filter((field) => field.kind === 'front') },
    { title: 'Seiten', rows: fields.filter((field) => field.kind === 'side') },
  ];
  return (
    <div className="v2-field-list">
      {groups.map((group) => group.rows.length > 0 && (
        <div key={group.title} className="v2-group">
          <h3 className="v2-group__title">{group.title}</h3>
          {group.rows.map((field) => {
            const entry = equipmentFor(configuration, field.id);
            const names = [...entry.elements.map((element) => elementNameDe[element.type]), ...(entry.gable ? [elementNameDe.giebeldreieck] : [])];
            return (
              <button key={field.id} type="button" className="v2-field-row" onClick={() => onSelectField(field.id)}>
                <span className="v2-row-text"><strong>{field.label}</strong>
                  <small>{field.kind === 'side' ? `${field.detail} · mit Giebeldreieck möglich` : field.detail}</small></span>
                <span className="v2-field-row__status">{names.length ? names.join(' + ') : 'Leer'}</span>
                <span className="v2-square-button" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>
                </span>
              </button>
            );
          })}
        </div>
      ))}
      <p className="v2-hint">Bis zu 2 Elemente je Feld, zum Beispiel unten Aluminiumwand und oben Seitenwand lichtdurchlässig. Dachfelder werden im Bereich Dach eingestellt.</p>
    </div>
  );
}

function FieldDetail({ configuration, field, onChange, onBack }: {
  configuration: ConfigurationV1; field: FieldDescriptor; onChange: (next: ConfigurationV1) => void; onBack: () => void;
}) {
  const entry = equipmentFor(configuration, field.id);
  const [picking, setPicking] = useState(false);
  const [openSettings, setOpenSettings] = useState<string | null>(null);
  const elements = entry.elements;
  const lower = entry.lowerHeightMm ?? 0;
  // Listed top first, as the customer sees the field.
  const ordered = elements.map((element, index) => ({ element, index })).reverse();
  const addable = fieldElementTypes.filter((type) => canPlace(configuration, field, type).ok);
  const gsw = elements.find((element) => element.type === 'glasschiebewand');
  const commit = (next: ConfigurationV1 | null) => { if (next) onChange(next); };
  const positionText = (index: number) => elements.length === 1 ? `Ganze Höhe · ${cm(field.heightMm)} cm`
    : index === 0 ? `Unten · ${cm(lower)} cm` : `Oben · ${cm(field.heightMm - lower)} cm`;

  return (
    <div className="v2-field-detail">
      <div className="v2-field-detail__head">
        <button type="button" className="v2-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
          Alle Felder
        </button>
        <h3>{field.label}</h3>
        <p>{field.detail} · Höhe {cm(field.heightMm)} cm</p>
      </div>

      <div className="v2-subhead"><h3>Elemente</h3><span>{elements.length} von 2</span></div>
      {ordered.map(({ element, index }) => (
        <div key={element.type} className="v2-element-row">
          <span className="v2-element-row__picture" aria-hidden="true"><EquipmentIcon kind={element.type} /></span>
          <span className="v2-row-text"><strong>{elementNameDe[element.type]}</strong><small>{positionText(index)}</small></span>
          <button type="button" className="v2-icon-button" aria-label={`${elementNameDe[element.type]} entfernen`}
            onClick={() => onChange(removeFromField(configuration, field.id, element.type))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      ))}
      {elements.length < 2 && addable.length > 0 && (picking || elements.length === 0
        ? <div className="v2-add-picker" role="group" aria-label="Element hinzufügen">
          {addable.map((type) => (
            <button key={type} type="button" className="v2-chip" onClick={() => { commit(addToField(configuration, field.id, type)); setPicking(false); }}>
              <EquipmentIcon kind={type} />{elementNameDe[type]}
            </button>
          ))}
        </div>
        : <button type="button" className="v2-dashed-button" onClick={() => setPicking(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>
          Zweites Element hinzufügen
        </button>)}

      {field.kind === 'side' && (
        <label className={`v2-check-row ${entry.gable ? 'v2-check-row--on' : ''}`}>
          <input type="checkbox" checked={entry.gable}
            onChange={() => onChange(entry.gable ? removeFromField(configuration, field.id, 'giebeldreieck') : addToField(configuration, field.id, 'giebeldreieck') ?? configuration)} />
          <span className="v2-check-row__box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
          </span>
          <span className="v2-row-text"><strong>Giebeldreieck</strong><small>Dreieck zwischen Seitenwand und Dach</small></span>
        </label>
      )}

      {elements.length === 2 && <SplitEditor configuration={configuration} field={field} elements={elements} lowerMm={lower} onChange={onChange} />}

      {gsw && <GlassSlidingSettings configuration={configuration} field={field} element={gsw} onChange={onChange} />}

      {elements.filter((element) => element.type !== 'glasschiebewand').map((element) => (
        <div key={element.type} className="v2-collapsible">
          <button type="button" className="v2-collapsible__head" aria-expanded={openSettings === element.type}
            onClick={() => setOpenSettings(openSettings === element.type ? null : element.type)}>
            Einstellungen {elementNameDe[element.type]}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {openSettings === element.type && <p className="v2-hint">Ausführung, Farben und Maße folgen, sobald dieses Element freigegeben ist. Profilfarbe wie Rahmen ({frameColors[configuration.frameColor].ral}).</p>}
        </div>
      ))}
    </div>
  );
}

function GlassSlidingSettings({ configuration, field, element, onChange }: {
  configuration: ConfigurationV1; field: FieldDescriptor; element: FieldElement; onChange: (next: ConfigurationV1) => void;
}) {
  const frame = frameColors[configuration.frameColor];
  return (
    <div className="v2-stack">
      <div className="v2-readonly-row">
        <span className="v2-row-text"><strong>Glasflügel<InfoTip text="Die Anzahl der Glasflügel wird automatisch aus der Feldbreite berechnet. Die Tabelle der Schienen (3, 4, 5 oder 6) wird noch ergänzt." /></strong>
          <small>Automatisch aus der Feldbreite berechnet</small></span>
        <strong className="v2-readonly-row__value">Tabelle folgt</strong>
      </div>
      <div className="v2-stack v2-stack--tight">
        <h3 className="v2-label">Glaston</h3>
        <div className="v2-tone-grid" role="radiogroup" aria-label="Glaston">
          {glassTones.map((tone) => (
            <button key={tone} type="button" role="radio" aria-checked={(element.glassTone ?? 'klar') === tone} className="v2-tone-card"
              onClick={() => onChange(updateElement(configuration, field.id, 'glasschiebewand', { glassTone: tone }))}>
              <span className="v2-tone-card__disc" style={{ background: glassSwatch[tone] }} aria-hidden="true" />
              {glassToneDe[tone]}
            </button>
          ))}
        </div>
      </div>
      <div className="v2-stack v2-stack--tight">
        <h3 className="v2-label">Öffnungsrichtung</h3>
        <div className="v2-segmented" role="radiogroup" aria-label="Öffnungsrichtung">
          {openingDirections.map((direction) => (
            <button key={direction} type="button" role="radio" aria-checked={(element.openingDirection ?? 'mittig') === direction}
              onClick={() => onChange(updateElement(configuration, field.id, 'glasschiebewand', { openingDirection: direction }))}>
              {openingDirectionDe[direction]}
            </button>
          ))}
        </div>
      </div>
      <div className="v2-readonly-row">
        <span className="v2-swatch-dot" style={{ background: frame.hex }} aria-hidden="true" />
        <span className="v2-row-text"><strong>Profilfarbe wie Rahmen</strong><small>{frame.ral} {frame.nameDe}</small></span>
      </div>
    </div>
  );
}

/** Split bar: drag the line in the sketch or type the height of the lower part. */
function SplitEditor({ configuration, field, elements, lowerMm: savedLowerMm, onChange }: {
  configuration: ConfigurationV1; field: FieldDescriptor; elements: FieldElement[]; lowerMm: number; onChange: (next: ConfigurationV1) => void;
}) {
  const sketchRef = useRef<HTMLDivElement>(null);
  // While dragging only the sketch follows; one revision is recorded when the pointer is released.
  const [draftMm, setDraftMm] = useState<number | null>(null);
  const range = splitRange(field);
  const lowerMm = draftMm ?? savedLowerMm;
  const lowerShare = Math.max(0, Math.min(1, lowerMm / field.heightMm));
  const setFromPointer = (clientY: number) => {
    const box = sketchRef.current?.getBoundingClientRect();
    if (!box || !range) return;
    const share = 1 - (clientY - box.top) / box.height;
    setDraftMm(Math.max(range.minMm, Math.min(range.maxMm, Math.round((share * field.heightMm) / 10) * 10)));
  };
  const finishDrag = () => {
    if (draftMm !== null) { const next = setLowerHeight(configuration, field.id, draftMm); if (next) onChange(next); }
    setDraftMm(null);
  };
  const fill = (element: FieldElement) => element.type === 'aluminiumwand' ? frameColors[configuration.frameColor].hex
    : element.type === 'senkrechtmarkise' ? '#8c8676' : element.type === 'seitenwand_licht'
      ? 'repeating-linear-gradient(90deg, #F7F7F4 0 24px, #ECEBE6 24px 25px)' : glassSwatch[element.glassTone ?? 'klar'];
  return (
    <div className="v2-stack">
      <div className="v2-subhead"><h3>Aufteilung</h3>
        <button type="button" className="v2-link-button" onClick={() => onChange(swapElements(configuration, field.id))}>Oben/Unten tauschen</button></div>
      <div className="v2-split">
        <div className="v2-split__sketch" ref={sketchRef}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event.clientY); }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event.clientY); }}
          onPointerUp={finishDrag} onPointerCancel={() => setDraftMm(null)}>
          <div className="v2-split__part" style={{ top: 0, height: `${(1 - lowerShare) * 100}%`, background: fill(elements[1]) }} />
          <div className="v2-split__part" style={{ bottom: 0, height: `${lowerShare * 100}%`, background: fill(elements[0]) }} />
          <div className="v2-split__line" style={{ top: `${(1 - lowerShare) * 100}%` }}>
            <span className="v2-split__handle" role="slider" tabIndex={0} aria-label="Höhe unten"
              aria-valuemin={(range?.minMm ?? MIN_SPLIT_PART_MM) / 10} aria-valuemax={(range?.maxMm ?? field.heightMm) / 10} aria-valuenow={lowerMm / 10}
              onKeyDown={(event) => {
                const delta = event.key === 'ArrowUp' ? 10 : event.key === 'ArrowDown' ? -10 : 0;
                if (!delta) return;
                event.preventDefault();
                const next = setLowerHeight(configuration, field.id, savedLowerMm + delta);
                if (next) onChange(next);
              }} />
          </div>
        </div>
        <div className="v2-split__fields">
          <div className="v2-stack v2-stack--tight">
            <span className="v2-label">Oben · {shortName(elements[1].type)}</span>
            <output className="v2-readonly-value">{cm(field.heightMm - lowerMm)} <small>cm</small></output>
          </div>
          <DimensionField label={`Unten · ${shortName(elements[0].type)}`} valueMm={lowerMm} minimumMm={range?.minMm} maximumMm={range?.maxMm}
            onValueChange={(value) => { if (value !== null) { const next = setLowerHeight(configuration, field.id, value); if (next) onChange(next); } }} />
          <p className="v2-hint">Linie ziehen oder Höhe eingeben. Gesamthöhe am Feld {cm(field.heightMm)} cm. Mindestens {cm(MIN_SPLIT_PART_MM)} cm je Teil (vorläufig).</p>
        </div>
      </div>
    </div>
  );
}

function shortName(kind: EquipmentKind): string {
  return kind === 'seitenwand_licht' ? 'lichtdurchlässig' : elementNameDe[kind];
}
