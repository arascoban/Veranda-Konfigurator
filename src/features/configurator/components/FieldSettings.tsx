import { useRef, useState } from 'react';
import { frameColors } from '../../../catalog/catalog';
import type { ConfigurationV1 } from '../../../domain/configuration';
import {
  addSideDivider, addToField, BEAM_MM, canPlace, dividerRange, divideSide, equalizeSide, elementNameDe, equipmentFor, fieldElementTypes, gableVariantDe, gableVariants, glassToneDe,
  glassTones, lichtWindows, lightFillings, listFields, MAX_SIDE_PARTS, MIN_SIDE_PART_MM, MIN_SPLIT_PART_MM, elementHeightsMm, gswCheck, openingDirectionDe, openingOf,
  openingDirections, placeRefusalDe, removeFromField, setDivider, setGable, setLowerHeight, sideLayoutOf, sideOfField, splitHorizontally, splitRange,
  swapElements, updateElement, type EquipmentKind, type FieldDescriptor, type FieldElement, type GableVariant,
} from '../../../domain/fieldEquipment';
import { EquipmentIcon } from '../../../ui/EquipmentIcon';
import { InfoTip } from '../../../ui/InfoTip';
import { DimensionField } from './DimensionField';
import { Button } from '../../../ui/Button';

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const cm = (mm: number) => numberDe.format(mm / 10);
const glassSwatch = { klar: 'rgba(211,228,238,.8)', getoent: 'rgba(63,71,77,.6)' } as const;
const gableSwatch: Record<GableVariant, string> = {
  aluminium: 'repeating-linear-gradient(0deg, #4a5055 0 6px, #383e42 6px 7px)', glas_klar: 'rgba(211,228,238,.8)', glas_milch: '#eef0ef',
  glas_getoent: 'rgba(63,71,77,.6)', poly_opal: '#f3efe4', poly_klar: 'rgba(221,232,238,.9)', poly_bronze: '#5a524c',
};

/** Feld section (V2): list of front and side fields, or the detail of the selected field. */
export function FieldSettings({ configuration, onChange, selectedFieldId, onSelectField }: {
  configuration: ConfigurationV1;
  onChange: (next: ConfigurationV1) => void;
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
}) {
  const fields = listFields(configuration);
  // After "Feld unterteilen" the side's ids change: stay on the same side (its first part, or the whole side).
  const selected = fields.find((field) => field.id === selectedFieldId)
    ?? fields.find((field) => selectedFieldId?.startsWith('side:') && field.side === sideOfField(selectedFieldId) && (field.partIndex ?? 1) === 1);
  if (selected) return <FieldDetail key={selected.id} configuration={configuration} field={selected} onChange={onChange} onBack={() => onSelectField(null)} />;
  if (!fields.length) return <p className="v2-hint">Bitte zuerst gültige Maße festlegen.</p>;
  const groups = [
    { title: 'Vorne', rows: fields.filter((field) => field.kind === 'front') },
    { title: 'Seiten', rows: fields.filter((field) => field.kind === 'side') },
    { title: 'Hinten', rows: fields.filter((field) => field.kind === 'rear') },
  ];
  return (
    <div className="v2-field-list">
      {groups.map((group) => group.rows.length > 0 && (
        <div key={group.title} className="v2-group">
          <h3 className="v2-group__title">{group.title}</h3>
          {group.rows.map((field) => {
            const entry = equipmentFor(configuration, field.id);
            const gable = field.side ? sideLayoutOf(configuration, field.side).gable : null;
            const names = [...entry.elements.map((element) => elementNameDe[element.type]), ...(gable && (field.partIndex ?? 1) === 1 ? [`Giebel ${gableVariantDe[gable]}`] : [])];
            return (
              <button key={field.id} type="button" className="v2-field-row" onClick={() => onSelectField(field.id)}>
                <span className="v2-row-text"><strong>{field.label}</strong>
                  <small>{field.detail}</small></span>
                <span className="v2-field-row__status">{names.length ? names.join(' + ') : 'Leer'}</span>
                <span className="v2-square-button" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>
                </span>
              </button>
            );
          })}
        </div>
      ))}
      <p className="v2-hint">Bis zu 2 Elemente je Feld, dazwischen ein 50×100-Profil. Seiten lassen sich im Feld in bis zu 3 Teile teilen. Dachfelder werden im Bereich Dach eingestellt.</p>
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
    : index === 0 ? `Unten · ${cm(lower)} cm` : `Oben · ${cm(field.heightMm - lower - BEAM_MM)} cm`;
  const horizontal = splitHorizontally(configuration, field.id);

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
      {horizontal && (
        <button type="button" className="v2-dashed-button" onClick={() => onChange(horizontal)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 13h16" /></svg>
          Horizontal teilen (unten Aluminiumwand)
        </button>
      )}

      {field.kind === 'side' && <SideSettings configuration={configuration} field={field} onChange={onChange} />}

      {elements.length === 2 && <SplitEditor configuration={configuration} field={field} elements={elements} lowerMm={lower} onChange={onChange} />}

      {gsw && <GlassSlidingSettings configuration={configuration} field={field} element={gsw} onChange={onChange} />}

      {elements.filter((element) => element.type === 'seitenwand_licht').map((element) => (
        <LightWallSettings key={element.type} configuration={configuration} field={field} element={element} onChange={onChange} />
      ))}

      {elements.filter((element) => element.type !== 'glasschiebewand' && element.type !== 'seitenwand_licht').map((element) => (
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

/** Giebeldreieck (rules 1, 3, 4) and "Feld unterteilen" (rule 2) of the side this field belongs to. */
function SideSettings({ configuration, field, onChange }: {
  configuration: ConfigurationV1; field: FieldDescriptor; onChange: (next: ConfigurationV1) => void;
}) {
  const side = field.side!;
  const layout = sideLayoutOf(configuration, side);
  const sideName = side === 'left' ? 'Seite links' : 'Seite rechts';
  const parts = listFields(configuration).filter((item) => item.kind === 'side' && item.side === side);
  return (
    <div className="v2-stack">
      <div className="v2-subhead"><h3>Giebeldreieck</h3><span>{sideName}</span></div>
      <label className={`v2-check-row ${layout.gable ? 'v2-check-row--on' : ''}`}>
        <input type="checkbox" checked={layout.gable !== null}
          onChange={() => onChange(layout.gable ? removeFromField(configuration, field.id, 'giebeldreieck') : addToField(configuration, field.id, 'giebeldreieck') ?? configuration)} />
        <span className="v2-check-row__box" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        </span>
        <span className="v2-row-text"><strong>Giebeldreieck</strong>
          <small>Pflicht, sobald die Seite unten ausgestattet oder geteilt ist; darunter immer ein 50×100-Profil</small></span>
      </label>
      {layout.gable && (
        <div className="v2-tone-grid v2-tone-grid--three" role="radiogroup" aria-label="Ausführung Giebeldreieck">
          {gableVariants.map((variant) => (
            <button key={variant} type="button" role="radio" aria-checked={layout.gable === variant} className="v2-tone-card"
              onClick={() => onChange(setGable(configuration, side, variant))}>
              <span className="v2-tone-card__disc" style={{ background: gableSwatch[variant] }} aria-hidden="true" />
              {gableVariantDe[variant]}
            </button>
          ))}
        </div>
      )}
      <div className="v2-subhead"><h3>Feld unterteilen</h3><span>{parts.length === 1 ? 'ungeteilt' : `${parts.length} Teile · 50×100`}</span></div>
      <div className="post-actions">
        <Button size="small" disabled={!addSideDivider(configuration, side)}
          onClick={() => { const next = addSideDivider(configuration, side); if (next) onChange(next); }}>Feld unterteilen</Button>
        <Button size="small" disabled={layout.dividersMm.length === 0}
          onClick={() => { const next = divideSide(configuration, side, 1); if (next) onChange(next); }}>Teilung entfernen</Button>
        <Button size="small" disabled={!equalizeSide(configuration, side)}
          onClick={() => { const next = equalizeSide(configuration, side); if (next) onChange(next); }}>Feld gleich unterteilen</Button>
      </div>
      {layout.dividersMm.map((centre, index) => {
        const range = dividerRange(configuration, side, index);
        const part = parts[index];
        if (!range || !part) return null;
        // The customer types the clear width of the part on the wall side of this divider.
        const startOf = part.startMm ?? 0;
        return (
          <DimensionField key={index} label={`Teil ${index + 1} · lichte Breite`} valueMm={Math.round(centre - BEAM_MM / 2 - startOf)}
            minimumMm={range.minMm - BEAM_MM / 2 - startOf} maximumMm={range.maxMm - BEAM_MM / 2 - startOf}
            onValueChange={(value) => { if (value !== null) { const next = setDivider(configuration, side, index, startOf + value + BEAM_MM / 2); if (next) onChange(next); } }} />
        );
      })}
      <p className="v2-hint">Jeder Klick teilt den breitesten Teil mit einem 50×100 (höchstens {MAX_SIDE_PARTS} Teile). Die 50×100 lassen sich im Modell ziehen oder hier einstellen; jeder Teil mindestens {cm(MIN_SIDE_PART_MM)} cm und ein eigenes Feld.</p>
    </div>
  );
}

/** Seitenwand lichtdurchlässig: filling and the resulting WD-55 windows (panes 11–110 cm). */
function LightWallSettings({ configuration, field, element, onChange }: {
  configuration: ConfigurationV1; field: FieldDescriptor; element: FieldElement; onChange: (next: ConfigurationV1) => void;
}) {
  const windows = lichtWindows(field.widthMm);
  const frame = frameColors[configuration.frameColor];
  return (
    <div className="v2-stack">
      <div className="v2-readonly-row">
        <span className="v2-row-text"><strong>Fenster<InfoTip text="WD-55-Rahmen nebeneinander; jede Scheibe ist 11 bis 110 cm breit. Die Anzahl ergibt sich aus der lichten Weite des Feldes." /></strong>
          <small>{windows ? `Scheibe je ${cm(windows.paneMm)} cm` : 'Feld zu schmal'}</small></span>
        <strong className="v2-readonly-row__value">{windows?.count ?? '–'}</strong>
      </div>
      <div className="v2-stack v2-stack--tight">
        <h3 className="v2-label">Füllung</h3>
        <div className="v2-tone-grid v2-tone-grid--three" role="radiogroup" aria-label="Füllung">
          {lightFillings.map((filling) => (
            <button key={filling} type="button" role="radio" aria-checked={(element.filling ?? 'glas_klar') === filling} className="v2-tone-card"
              onClick={() => onChange(updateElement(configuration, field.id, 'seitenwand_licht', { filling }))}>
              <span className="v2-tone-card__disc" style={{ background: gableSwatch[filling] }} aria-hidden="true" />
              {gableVariantDe[filling]}
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

function GlassSlidingSettings({ configuration, field, element, onChange }: {
  configuration: ConfigurationV1; field: FieldDescriptor; element: FieldElement; onChange: (next: ConfigurationV1) => void;
}) {
  const frame = frameColors[configuration.frameColor];
  const entry = equipmentFor(configuration, field.id);
  const height = elementHeightsMm(field, entry)[entry.elements.findIndex((item) => item.type === 'glasschiebewand')] ?? field.heightMm;
  const check = gswCheck(field, height);
  return (
    <div className="v2-stack">
      <div className="v2-readonly-row">
        <span className="v2-row-text"><strong>Glasflügel<InfoTip text="Anzahl der Flügel, Schienen und Glasbreite (90, 98 oder 103 cm) ergeben sich automatisch aus der lichten Weite des Feldes. Die Flügel überlappen mindestens 4 cm." /></strong>
          <small>{check.ok ? `${check.layout.railProfile} Schienen · Glas ${cm(check.layout.glassWidthMm)} cm · Überlappung ${cm(check.layout.overlapMm)} cm` : 'Automatisch aus der lichten Weite'}</small></span>
        <strong className="v2-readonly-row__value">{check.ok ? check.layout.leaves : '–'}</strong>
      </div>
      {!check.ok && <p className="v2-hint v2-error-text">Glasschiebewand passt hier nicht: {placeRefusalDe[check.reason]}.</p>}
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
            <button key={direction} type="button" role="radio" aria-checked={openingOf(element, field) === direction}
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
  const range = splitRange(field, elements);
  const lowerMm = draftMm ?? savedLowerMm;
  const lowerShare = Math.max(0, Math.min(1, lowerMm / field.heightMm));
  const beamShare = BEAM_MM / field.heightMm;
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
      ? gableSwatch[element.filling ?? 'glas_klar'] : glassSwatch[element.glassTone ?? 'klar'];
  return (
    <div className="v2-stack">
      <div className="v2-subhead"><h3>Aufteilung</h3>
        <button type="button" className="v2-link-button" onClick={() => onChange(swapElements(configuration, field.id))}>Oben/Unten tauschen</button></div>
      <div className="v2-split">
        <div className="v2-split__sketch" ref={sketchRef}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event.clientY); }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event.clientY); }}
          onPointerUp={finishDrag} onPointerCancel={() => setDraftMm(null)}>
          <div className="v2-split__part" style={{ top: 0, height: `${(1 - lowerShare - beamShare) * 100}%`, background: fill(elements[1]) }} />
          <div className="v2-split__part" style={{ bottom: 0, height: `${lowerShare * 100}%`, background: fill(elements[0]) }} />
          <div className="v2-split__line" style={{ top: `${(1 - lowerShare - beamShare / 2) * 100}%` }}>
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
            <output className="v2-readonly-value">{cm(field.heightMm - lowerMm - BEAM_MM)} <small>cm</small></output>
          </div>
          <DimensionField label={`Unten · ${shortName(elements[0].type)}`} valueMm={lowerMm} minimumMm={range?.minMm} maximumMm={range?.maxMm}
            onValueChange={(value) => { if (value !== null) { const next = setLowerHeight(configuration, field.id, value); if (next) onChange(next); } }} />
          <p className="v2-hint">50×100 im Modell oder hier ziehen, oder Höhe eingeben. Gesamthöhe am Feld {cm(field.heightMm)} cm, davon 5 cm 50×100. {elements.some((element) => element.type === 'glasschiebewand') ? 'Glasschiebewand mindestens 100 cm über dem 50×100, anderer Teil mindestens ' : 'Mindestens '}{cm(MIN_SPLIT_PART_MM)} cm.</p>
        </div>
      </div>
    </div>
  );
}

function shortName(kind: EquipmentKind): string {
  return kind === 'seitenwand_licht' ? 'lichtdurchlässig' : elementNameDe[kind];
}
