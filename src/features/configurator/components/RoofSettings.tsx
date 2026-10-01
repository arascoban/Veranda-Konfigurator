import { awningRules, MAX_EXTRA_ROOF_BAYS, roofFinishes, type RoofFinishId } from '../../../catalog/catalog';
import { awningAvailability, createAwning, defaultTwoWidths, type AwningType } from '../../../domain/awning';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { calculateRoofBayGeometry, minimumRoofBayCount } from '../../../domain/geometry/roof';
import { ledRafterCount, maxLedPerRafter } from '../../../domain/led';
import { finishesOfFamily, resolveRoofFieldFinishes, roofFieldName, withRoofFieldFinish, withRoofFinish } from '../../../domain/roofFinish';
import { de, issueTextDe } from '../../../content/de';
import { Icon } from '../../../ui/Icon';
import { StatusMessage } from '../../../ui/StatusMessage';
import { DimensionField } from './DimensionField';

const numberDe = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const cm = (mm: number) => `${numberDe.format(mm / 10)} cm`;

export function RoofSettings({ configuration, evaluation, onChange, selectedRoofField = null, onSelectRoofField }: {
  configuration: ConfigurationV1;
  evaluation: ConfigurationEvaluation;
  onChange: (next: ConfigurationV1) => void;
  /** Roof field (inside-left index) selected here or in the model. */
  selectedRoofField?: number | null;
  onSelectRoofField?: (index: number | null) => void;
}) {
  const roof = evaluation.roof;
  const width = configuration.dimensionsMm.width;
  const depth = configuration.dimensionsMm.depth;
  const family = configuration.roofMaterialId;
  const minimum = width === null ? null : minimumRoofBayCount(width, family);
  const fieldFinishes = resolveRoofFieldFinishes(configuration, roof);
  const availability = awningAvailability(configuration);
  const sideFieldMode = roof?.awningSideFields ?? false;
  const canIncrease = Boolean(roof && minimum !== null && !sideFieldMode && roof.bayCount < minimum + MAX_EXTRA_ROOF_BAYS
    && width !== null && calculateRoofBayGeometry(width, family, roof.bayCount + 1)?.valid);
  const changeCount = (delta: number) => {
    if (!roof || minimum === null) return;
    const next = roof.bayCount + delta;
    if (next < minimum || next > minimum + MAX_EXTRA_ROOF_BAYS) return;
    onChange({ ...configuration, roofBayCount: next === minimum ? null : next, roofFieldFinishes: [] });
  };
  const selectAll = (finish: RoofFinishId) => { onChange(withRoofFinish(configuration, finish)); };
  const selectField = (index: number, finish: RoofFinishId) => {
    if (roof) onChange(withRoofFieldFinish(configuration, index, finish, roof.bayCount));
  };
  const setAwningType = (type: AwningType | null) => {
    onChange({ ...configuration, awning: type ? (configuration.awning ? { ...configuration.awning, type } : createAwning(configuration, type)) : null, roofFieldFinishes: [] });
  };
  const awning = configuration.awning;
  const setAwningCount = (count: 1 | 2) => {
    if (!awning || width === null) return;
    onChange({ ...configuration, awning: { ...awning, count, widthsMm: count === 2 ? defaultTwoWidths(width) : null }, roofFieldFinishes: [] });
  };
  const setAwningWidth = (side: 0 | 1, valueMm: number | null) => {
    if (!awning || width === null || valueMm === null) return;
    const other = width - valueMm;
    onChange({ ...configuration, awning: { ...awning, widthsMm: side === 0 ? [valueMm, other] : [other, valueMm] } });
  };
  const ledMax = maxLedPerRafter(depth);
  const ledRafters = roof ? ledRafterCount(roof.supportCount) : 0;
  const gardenOrder = roof ? Array.from({ length: roof.bayCount }, (_, i) => roof.bayCount - 1 - i) : [];
  const toneLabel = (id: RoofFinishId) => `${roofFinishes[id].nameDe} ${roofFinishes[id].toneDe}`;

  return (
    <section aria-labelledby="roof-heading">
      <h3 id="roof-heading" className="section-heading">Dacheindeckung</h3>
      <p className="field-hint">Für alle Dachfelder. Die Farbe einzelner Felder lässt sich darunter oder durch Antippen im Modell ändern.</p>
      {(['glass', 'polycarbonate'] as const).map((group) => (
        <div key={group} className="roof-finish-group">
          <span className="option-row__label">{de.roofMaterials[group]}</span>
          <div className="color-swatches color-swatches--roof" role="radiogroup" aria-label={`Dacheindeckung ${de.roofMaterials[group]}`}>
            {finishesOfFamily(group).map((id) => (
              <button key={id} type="button" role="radio" className="color-swatch"
                aria-checked={family === group && configuration.roofFinish === id && configuration.roofFieldFinishes.every((entry) => !entry || entry === id)}
                onClick={() => selectAll(id)}>
                <span className="color-swatch__disc" style={{ '--swatch': roofFinishes[id].hex, '--swatch-alpha': roofFinishes[id].opacity } as React.CSSProperties} aria-hidden="true" />
                <span className="color-swatch__name">{roofFinishes[id].nameDe}<br />{roofFinishes[id].toneDe}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <h3 className="section-subheading">Dachfelder</h3>
      {roof && minimum !== null ? <>
        <div className="number-stepper" aria-label="Anzahl der Dachfelder">
          <button className="number-stepper__button" type="button" aria-label="Dachfeld entfernen"
            disabled={sideFieldMode || roof.bayCount <= minimum} onClick={() => changeCount(-1)}><Icon name="minus" /></button>
          <output className="number-stepper__value">{roof.bayCount} Felder · {roof.supportCount} Träger</output>
          <button className="number-stepper__button" type="button" aria-label="Dachfeld hinzufügen"
            disabled={!canIncrease} onClick={() => changeCount(1)}><Icon name="plus" /></button>
        </div>
        <p className="field-hint">{sideFieldMode
          ? `Mit einer Markise über 600 cm Breite ist die Aufteilung fest: 600 cm Mitte und zwei Seitenfelder je ${cm(availability.sideFieldMm)} (Milchglas).`
          : `Mindestens ${minimum}, höchstens ${minimum + MAX_EXTRA_ROOF_BAYS} Felder.`}</p>
        {roof.reasons.map((reason) => <StatusMessage key={reason} tone="error">{issueTextDe[reason]}</StatusMessage>)}
        <ul className="roof-field-list" aria-label="Dachfelder vom Garten aus gesehen">
          {gardenOrder.map((index) => {
            const selected = selectedRoofField === index;
            return (
              <li key={index} className={`roof-field ${selected ? 'roof-field--selected' : ''}`}>
                <button type="button" className="roof-field__row" aria-pressed={selected}
                  onClick={() => onSelectRoofField?.(selected ? null : index)}>
                  <span className="roof-field__disc" style={{ '--swatch': roofFinishes[fieldFinishes[index]].hex, '--swatch-alpha': roofFinishes[fieldFinishes[index]].opacity } as React.CSSProperties} aria-hidden="true" />
                  <span className="roof-field__name">{roofFieldName(index, roof.bayCount)}</span>
                  <span className="roof-field__tone">{toneLabel(fieldFinishes[index])} · {cm(roof.capWidthsMm[index])}</span>
                </button>
                {selected && <div className="color-swatches color-swatches--roof" role="radiogroup" aria-label={`Farbe für ${roofFieldName(index, roof.bayCount)}`}>
                  {finishesOfFamily(family).map((id) => (
                    <button key={id} type="button" role="radio" className="color-swatch" aria-checked={fieldFinishes[index] === id}
                      onClick={() => selectField(index, id)}>
                      <span className="color-swatch__disc" style={{ '--swatch': roofFinishes[id].hex, '--swatch-alpha': roofFinishes[id].opacity } as React.CSSProperties} aria-hidden="true" />
                      <span className="color-swatch__name">{roofFinishes[id].toneDe}</span>
                    </button>
                  ))}
                </div>}
              </li>
            );
          })}
        </ul>
      </> : <StatusMessage tone="info">Geben Sie zuerst eine gültige Breite ein, um Dachfelder zu berechnen.</StatusMessage>}

      <h3 className="section-subheading">Markise</h3>
      {availability.reason === 'polycarbonate' ? (
        <p className="field-hint">Markisen sind nur mit Glasdach möglich.</p>
      ) : !availability.available ? (
        <p className="field-hint">{availability.reason === 'depth_too_small' ? 'Für eine Markise ist eine Tiefe von mindestens 100 cm nötig.' : 'Bitte zuerst Breite und Tiefe eingeben.'}</p>
      ) : <>
        <div className="product-switch product-switch--three" role="group" aria-label="Markise">
          {([['none', 'Keine'], ['aufglas', 'Aufglas'], ['unterglas', 'Unterglas']] as const).map(([id, label]) => (
            <button key={id} type="button" className="product-switch__option" aria-pressed={(awning?.type ?? 'none') === id}
              onClick={() => setAwningType(id === 'none' ? null : id)}>{label}</button>
          ))}
        </div>
        {awning && width !== null && <>
          <div className="option-row">
            <span className="option-row__label">Anzahl</span>
            <div className="product-switch" role="group" aria-label="Anzahl der Markisen">
              <button type="button" className="product-switch__option" aria-pressed={awning.count === 1} disabled={availability.singleMode === 'unavailable'}
                onClick={() => setAwningCount(1)}>1 Markise</button>
              <button type="button" className="product-switch__option" aria-pressed={awning.count === 2} onClick={() => setAwningCount(2)}>2 Markisen</button>
            </div>
            <span className="field-hint">{availability.singleMode === 'unavailable'
              ? `Ab ${cm(awningRules.maxWidthMm + 2 * awningRules.sideFieldMaxMm)} Breite sind zwei Markisen erforderlich.`
              : availability.singleMode === 'side_fields' && awning.count === 1
                ? `Eine Markise von ${cm(awningRules.maxWidthMm)} in der Mitte; die beiden Seitenfelder (je ${cm(availability.sideFieldMm)}) werden Milchglas.`
                : awning.count === 1 ? `Die Markise deckt die volle Breite von ${cm(width)}.`
                  : `Je Markise ${cm(awningRules.minWidthMm)} bis ${cm(awningRules.maxWidthMm)}; zusammen ${cm(width)}.`}</span>
          </div>
          {awning.count === 2 && <div className="form-grid form-grid--pairs">
            <DimensionField label="Markise links" valueMm={(awning.widthsMm ?? defaultTwoWidths(width))[1]}
              minimumMm={Math.max(awningRules.minWidthMm, width - awningRules.maxWidthMm)} maximumMm={Math.min(awningRules.maxWidthMm, width - awningRules.minWidthMm)}
              onValueChange={(value) => setAwningWidth(1, value)} />
            <DimensionField label="Markise rechts" valueMm={(awning.widthsMm ?? defaultTwoWidths(width))[0]}
              minimumMm={Math.max(awningRules.minWidthMm, width - awningRules.maxWidthMm)} maximumMm={Math.min(awningRules.maxWidthMm, width - awningRules.minWidthMm)}
              onValueChange={(value) => setAwningWidth(0, value)} />
          </div>}
          <DimensionField label="Ausfall (Tiefe der Markise)" valueMm={awning.depthMm} wide
            minimumMm={awningRules.minDepthMm} maximumMm={availability.depthMaxMm}
            onValueChange={(value) => { if (value !== null) onChange({ ...configuration, awning: { ...awning, depthMm: value } }); }} />
          <p className="field-hint">Vorläufige Darstellung als einfacher Körper; das Markisenmodell folgt.</p>
        </>}
        {evaluation.issues.filter((issue) => issue.field === 'awning').map((issue) => (
          <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code] ?? 'Bitte prüfen Sie die Markise.'}</StatusMessage>
        ))}
      </>}

      <h3 className="section-subheading">LED-Beleuchtung</h3>
      <div className="number-stepper" aria-label="LED je Träger">
        <button className="number-stepper__button" type="button" aria-label="LED entfernen" disabled={configuration.ledPerRafter <= 0}
          onClick={() => onChange({ ...configuration, ledPerRafter: configuration.ledPerRafter - 1 })}><Icon name="minus" /></button>
        <output className="number-stepper__value">{configuration.ledPerRafter} LED je Träger</output>
        <button className="number-stepper__button" type="button" aria-label="LED hinzufügen" disabled={configuration.ledPerRafter >= ledMax}
          onClick={() => onChange({ ...configuration, ledPerRafter: configuration.ledPerRafter + 1 })}><Icon name="plus" /></button>
      </div>
      <p className="field-hint">Höchstens {ledMax} je Träger bei dieser Tiefe; die Eckträger erhalten keine LED.
        {roof ? ` ${ledRafters} Träger × ${configuration.ledPerRafter} = ${ledRafters * configuration.ledPerRafter} LED.` : ''}</p>
      {evaluation.issues.filter((issue) => issue.field === 'ledPerRafter').map((issue) => (
        <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code]}</StatusMessage>
      ))}
    </section>
  );
}
