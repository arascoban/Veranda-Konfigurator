import { useEffect, useState } from 'react';
import { awningFabrics, awningRules, MAX_EXTRA_ROOF_BAYS, roofFinishes, type RoofFinishId } from '../../../catalog/catalog';
import { awningAvailability, awningChangeNotice, awningDepthMm, createAwning, defaultTwoWidths, type AwningType } from '../../../domain/awning';
import type { ConfigurationV1 } from '../../../domain/configuration';
import type { ConfigurationEvaluation } from '../../../domain/evaluateConfiguration';
import { calculateRoofBayGeometry, minimumRoofBayCount } from '../../../domain/geometry/roof';
import { ledRafterCount, maxLedPerRafter } from '../../../domain/led';
import { finishesOfFamily, resolveRoofFieldFinishes, roofFieldName, withRoofFieldFinish, withRoofFinish } from '../../../domain/roofFinish';
import { de, issueTextDe } from '../../../content/de';
import { useNoticeStore } from '../../../state/noticeStore';
import { Icon } from '../../../ui/Icon';
import { InfoTip } from '../../../ui/InfoTip';
import { AddOnToggle, CollapseToggle, SectionHead } from '../../../ui/SectionHead';
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
  const pushNotice = useNoticeStore((state) => state.push);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  // A field tapped in the model opens the list so its tone can be chosen.
  useEffect(() => { if (selectedRoofField !== null) setFieldsOpen(true); }, [selectedRoofField]);
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
  const awning = configuration.awning;
  const applyAwning = (next: ConfigurationV1['awning']) => {
    // Notices explain automatic adjustments only; a removal chosen by the customer stays silent.
    const notice = next ? awningChangeNotice(configuration.awning, next, configuration) : null;
    if (notice) pushNotice(notice);
    onChange({ ...configuration, awning: next, roofFieldFinishes: [] });
  };
  const addAwning = () => applyAwning(createAwning(configuration, 'unterglas'));
  const setAwningType = (type: AwningType) => { if (awning) applyAwning({ ...awning, type }); };
  const setAwningCount = (count: 1 | 2) => {
    if (!awning || width === null) return;
    applyAwning({ ...awning, count, widthsMm: count === 2 ? defaultTwoWidths(width) : null });
  };
  const setAwningWidth = (side: 0 | 1, valueMm: number | null) => {
    if (!awning || width === null || valueMm === null) return;
    const other = width - valueMm;
    onChange({ ...configuration, awning: { ...awning, widthsMm: side === 0 ? [valueMm, other] : [other, valueMm] } });
  };
  const ledMax = maxLedPerRafter(depth);
  const ledRafters = roof ? ledRafterCount(roof.supportCount) : 0;
  const ledActive = configuration.ledPerRafter > 0;
  const addLed = () => onChange({ ...configuration, ledPerRafter: Math.min(2, Math.max(1, ledMax)) });
  const gardenOrder = roof ? Array.from({ length: roof.bayCount }, (_, i) => roof.bayCount - 1 - i) : [];
  const toneLabel = (id: RoofFinishId) => `${roofFinishes[id].nameDe} ${roofFinishes[id].toneDe}`;
  const unterglasDepth = awningDepthMm(configuration, 'unterglas');
  const swatchStyle = (id: RoofFinishId) => ({ '--swatch': roofFinishes[id].hex, '--swatch-alpha': roofFinishes[id].opacity } as React.CSSProperties);

  return (
    <section aria-labelledby="roof-heading">
      <SectionHead title="Dacheindeckung"
        info="Gilt für alle Dachfelder. Die Farbe einzelner Felder lässt sich in der Feldliste oder durch Antippen eines Feldes im Modell ändern. Alle Eindeckungen sind für Prime und Premium möglich." />
      <div className="roof-finish-grid" role="radiogroup" aria-label="Dacheindeckung">
        {(Object.keys(roofFinishes) as RoofFinishId[]).map((id) => (
          <button key={id} type="button" role="radio" className="roof-finish-card"
            aria-checked={configuration.roofFinish === id && configuration.roofFieldFinishes.every((entry) => !entry || entry === id)}
            onClick={() => selectAll(id)}>
            <span className="roof-finish-card__badge">{roofFinishes[id].family === 'glass' ? '8 mm' : '16 mm'}</span>
            <span className="color-swatch__disc color-swatch__disc--roof" style={swatchStyle(id)} aria-hidden="true" />
            <span className="roof-finish-card__name">{roofFinishes[id].family === 'glass' ? 'Glas' : 'Polycarbonat'}<br />{roofFinishes[id].toneDe}</span>
          </button>
        ))}
      </div>

      <SectionHead title="Dachfelder" picture="dachfelder.jpg" chip={roof ? `${roof.bayCount} Felder · ${roof.supportCount} Träger` : undefined}
        info={`Mindestens die berechnete Anzahl, höchstens ${MAX_EXTRA_ROOF_BAYS} Felder mehr. Mit einer Markise über 600 cm Breite ist die Aufteilung fest: Mitte für die Markise, zwei Seitenfelder in Milchglas. Dachfeld 1 liegt vom Garten aus links; die Liste zeigt die Farbe jedes Feldes.`}
        action={roof ? <CollapseToggle open={fieldsOpen} label="Dachfelder einzeln anzeigen" onToggle={() => setFieldsOpen((open) => !open)} /> : undefined} />
      {roof && minimum !== null ? <>
        <div className="number-stepper" aria-label="Anzahl der Dachfelder">
          <button className="number-stepper__button" type="button" aria-label="Dachfeld entfernen"
            disabled={sideFieldMode || roof.bayCount <= minimum} onClick={() => changeCount(-1)}><Icon name="minus" /></button>
          <output className="number-stepper__value">{roof.bayCount} Felder · {roof.supportCount} Träger</output>
          <button className="number-stepper__button" type="button" aria-label="Dachfeld hinzufügen"
            disabled={!canIncrease} onClick={() => changeCount(1)}><Icon name="plus" /></button>
        </div>
        {roof.reasons.map((reason) => <StatusMessage key={reason} tone="error">{issueTextDe[reason]}</StatusMessage>)}
        {fieldsOpen && <ul className="roof-field-list" aria-label="Dachfelder vom Garten aus gesehen">
          {gardenOrder.map((index) => {
            const selected = selectedRoofField === index;
            return (
              <li key={index} className={`roof-field ${selected ? 'roof-field--selected' : ''}`}>
                <button type="button" className="roof-field__row" aria-pressed={selected}
                  onClick={() => onSelectRoofField?.(selected ? null : index)}>
                  <span className="roof-field__disc" style={swatchStyle(fieldFinishes[index])} aria-hidden="true" />
                  <span className="roof-field__name">{roofFieldName(index, roof.bayCount)}</span>
                  <span className="roof-field__tone">{toneLabel(fieldFinishes[index])} · {cm(roof.capWidthsMm[index])}</span>
                </button>
                {selected && <div className="color-swatches color-swatches--roof" role="radiogroup" aria-label={`Farbe für ${roofFieldName(index, roof.bayCount)}`}>
                  {finishesOfFamily(family).map((id) => (
                    <button key={id} type="button" role="radio" className="color-swatch" aria-checked={fieldFinishes[index] === id}
                      onClick={() => selectField(index, id)}>
                      <span className="color-swatch__disc color-swatch__disc--roof" style={swatchStyle(id)} aria-hidden="true" />
                      <span className="color-swatch__name">{roofFinishes[id].toneDe}</span>
                    </button>
                  ))}
                </div>}
              </li>
            );
          })}
        </ul>}
      </> : <StatusMessage tone="info">Geben Sie zuerst eine gültige Breite ein, um Dachfelder zu berechnen.</StatusMessage>}

      <SectionHead title="Markise" picture="markise.jpg" chip={awning ? de.awningTypes[awning.type] : 'Aufglas oder Unterglas'}
        info={`Nur mit Glasdach. Eine Markise misst höchstens ${cm(awningRules.maxWidthMm)} × ${cm(awningRules.maxDepthMm)} und mindestens ${cm(awningRules.minWidthMm)} × ${cm(awningRules.minDepthMm)}. Über 600 cm Breite werden die äußeren Felder Milchglas (mindestens 15 cm, höchstens 86 cm); darüber sind zwei Markisen nötig. Die Unterglas-Markise reicht von der Pfostenrückseite bis zur Wand, die Aufglas-Markise ist so lang wie die Trägerabdeckung.`}
        action={availability.available ? <AddOnToggle active={Boolean(awning)} label="Markise" onAdd={addAwning} onRemove={() => applyAwning(null)} /> : undefined} />
      {availability.reason === 'polycarbonate' ? (
        <StatusMessage tone="info">Markisen sind nur mit Glasdach möglich.</StatusMessage>
      ) : !availability.available ? (
        <StatusMessage tone="info">{availability.reason === 'depth_too_small' ? 'Für eine Markise muss der Abstand von der Pfostenrückseite bis zur Wand mindestens 100 cm betragen.' : 'Bitte zuerst Breite und Tiefe eingeben.'}</StatusMessage>
      ) : awning && width !== null && <div className="addon-body">
        <div className="option-row">
          <span className="option-row__label">Art</span>
          <div className="product-switch" role="group" aria-label="Art der Markise">
            {(['unterglas', 'aufglas'] as const).map((type) => (
              <button key={type} type="button" className="product-switch__option" aria-pressed={awning.type === type} onClick={() => setAwningType(type)}>
                {type === 'unterglas' ? 'Unterglas' : 'Aufglas'}</button>
            ))}
          </div>
        </div>
        <div className="option-row">
          <span className="option-row__label">Anzahl
            <InfoTip text={availability.singleMode === 'unavailable'
              ? `Ab ${cm(awningRules.maxWidthMm + 2 * awningRules.sideFieldMaxMm)} Breite sind zwei gekoppelte Markisen erforderlich.`
              : availability.singleMode === 'side_fields'
                ? `Eine Markise von ${cm(width - 2 * availability.sideFieldMm)} in der Mitte; die beiden Seitenfelder (je ${cm(availability.sideFieldMm)}) werden Milchglas. Mit zwei Markisen bleiben alle Felder frei wählbar.`
                : `Eine Markise deckt die volle Breite von ${cm(width)}; bei zwei Markisen sind die Breiten frei (je ${cm(awningRules.minWidthMm)} bis ${cm(awningRules.maxWidthMm)}).`} />
          </span>
          <div className="product-switch" role="group" aria-label="Anzahl der Markisen">
            <button type="button" className="product-switch__option" aria-pressed={awning.count === 1} disabled={availability.singleMode === 'unavailable'}
              onClick={() => setAwningCount(1)}>1 Markise</button>
            <button type="button" className="product-switch__option" aria-pressed={awning.count === 2} onClick={() => setAwningCount(2)}>2 Markisen</button>
          </div>
        </div>
        {awning.count === 2 && <div className="form-grid form-grid--pairs">
          <DimensionField label="Markise links" valueMm={(awning.widthsMm ?? defaultTwoWidths(width))[1]}
            minimumMm={Math.max(awningRules.minWidthMm, width - awningRules.maxWidthMm)} maximumMm={Math.min(awningRules.maxWidthMm, width - awningRules.minWidthMm)}
            onValueChange={(value) => setAwningWidth(1, value)} />
          <DimensionField label="Markise rechts" valueMm={(awning.widthsMm ?? defaultTwoWidths(width))[0]}
            minimumMm={Math.max(awningRules.minWidthMm, width - awningRules.maxWidthMm)} maximumMm={Math.min(awningRules.maxWidthMm, width - awningRules.minWidthMm)}
            onValueChange={(value) => setAwningWidth(0, value)} />
        </div>}
        <div className="option-row">
          <span className="option-row__label">Ausfall
            <InfoTip text="Nicht einstellbar: Unterglas von der Pfostenrückseite bis zur Wand, Aufglas über die ganze Trägerabdeckung. Werden die Pfosten nach hinten gesetzt, verkürzt sich die Unterglas-Markise." /></span>
          <span className="option-row__value">{awning.type === 'unterglas' && unterglasDepth !== null ? cm(unterglasDepth) : 'Trägerlänge'}</span>
        </div>
        <div className="option-row">
          <span className="option-row__label">Antriebsseite<InfoTip text="Seite des Motors, vom Garten aus gesehen." /></span>
          <div className="product-switch" role="group" aria-label="Antriebsseite">
            {(['left', 'right'] as const).map((side) => (
              <button key={side} type="button" className="product-switch__option" aria-pressed={awning.motorSide === side}
                onClick={() => onChange({ ...configuration, awning: { ...awning, motorSide: side } })}>{side === 'left' ? 'Links' : 'Rechts'}</button>
            ))}
          </div>
        </div>
        <div className="option-row">
          <span className="option-row__label">Stoff<InfoTip text="Vorläufige Stoffmuster; die echten Stoffe folgen." /></span>
          <div className="fabric-grid" role="radiogroup" aria-label="Stoff der Markise">
            {awningFabrics.map((fabric) => (
              <button key={fabric.id} type="button" role="radio" className="fabric-card" aria-checked={awning.fabricId === fabric.id}
                onClick={() => onChange({ ...configuration, awning: { ...awning, fabricId: fabric.id } })}>
                <span className="fabric-card__sample" style={{ '--fabric': fabric.hex } as React.CSSProperties} aria-hidden="true" />
                <span className="fabric-card__name">{fabric.nameDe}</span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="addon-remove" onClick={() => applyAwning(null)}>Entfernen <Icon name="close" /></button>
        {evaluation.issues.filter((issue) => issue.field === 'awning').map((issue) => (
          <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code] ?? 'Bitte prüfen Sie die Markise.'}</StatusMessage>
        ))}
      </div>}

      <SectionHead title="Beleuchtung" picture="led.jpg" chip="Anzahl LED je Träger"
        info={`Je Träger höchstens eine LED je Meter Tiefe (ab 50 cm aufgerundet), bei dieser Tiefe ${ledMax}. Die Eckträger erhalten keine LED. Schaltbar und dimmbar unterscheiden sich im Preis.`}
        action={ledMax > 0 ? <AddOnToggle active={ledActive} label="Beleuchtung" onAdd={addLed} onRemove={() => onChange({ ...configuration, ledPerRafter: 0 })} /> : undefined} />
      {ledActive && <div className="addon-body">
        <div className="option-row">
          <span className="option-row__label">Anzahl LED je Träger</span>
          <div className="number-stepper" aria-label="LED je Träger">
            <button className="number-stepper__button" type="button" aria-label="LED entfernen" disabled={configuration.ledPerRafter <= 1}
              onClick={() => onChange({ ...configuration, ledPerRafter: configuration.ledPerRafter - 1 })}><Icon name="minus" /></button>
            <output className="number-stepper__value">{configuration.ledPerRafter}</output>
            <button className="number-stepper__button" type="button" aria-label="LED hinzufügen" disabled={configuration.ledPerRafter >= ledMax}
              onClick={() => onChange({ ...configuration, ledPerRafter: configuration.ledPerRafter + 1 })}><Icon name="plus" /></button>
          </div>
          <span className="option-row__value">{ledRafters} Träger × {configuration.ledPerRafter} = {ledRafters * configuration.ledPerRafter} LED</span>
        </div>
        <div className="option-row">
          <span className="option-row__label">Steuerung</span>
          <div className="product-switch" role="group" aria-label="Steuerung der Beleuchtung">
            {(['schaltbar', 'dimmbar'] as const).map((control) => (
              <button key={control} type="button" className="product-switch__option" aria-pressed={configuration.ledControl === control}
                onClick={() => onChange({ ...configuration, ledControl: control })}>{control === 'schaltbar' ? 'Schaltbar' : 'Dimmbar'}</button>
            ))}
          </div>
        </div>
        <button type="button" className="addon-remove" onClick={() => onChange({ ...configuration, ledPerRafter: 0 })}>Entfernen <Icon name="close" /></button>
        {evaluation.issues.filter((issue) => issue.field === 'ledPerRafter').map((issue) => (
          <StatusMessage key={issue.code} tone="error">{issueTextDe[issue.code]}</StatusMessage>
        ))}
      </div>}
    </section>
  );
}
