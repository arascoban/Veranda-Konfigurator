import { useEffect, useId, useState } from 'react';
import { centimetresToMillimetres, millimetresToCentimetres } from '../../../domain/units';

/**
 * Centimetre entry with live limits. Values outside `minimumMm..maximumMm` are not committed: the field
 * shows the limit and returns to the last valid value on blur. The ± buttons step by 1 cm inside the limits.
 */
export function DimensionField({ label, valueMm, help, error, maximumMm, minimumMm, onValueChange, wide = false, stepMm = 10 }: {
  label: string;
  valueMm: number | null;
  help: string;
  error?: string;
  maximumMm?: number;
  minimumMm?: number;
  onValueChange: (value: number | null) => void;
  wide?: boolean;
  stepMm?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState(valueMm === null ? '' : formatCentimetres(millimetresToCentimetres(valueMm)));
  const [localError, setLocalError] = useState('');
  useEffect(() => {
    setDraft(valueMm === null ? '' : formatCentimetres(millimetresToCentimetres(valueMm)));
    setLocalError('');
  }, [valueMm]);

  const limits = minimumMm !== undefined && maximumMm !== undefined
    ? `${formatCentimetres(millimetresToCentimetres(minimumMm))}–${formatCentimetres(millimetresToCentimetres(maximumMm))} cm`
    : maximumMm !== undefined ? `Max. ${formatCentimetres(millimetresToCentimetres(maximumMm))} cm`
      : minimumMm !== undefined ? `Min. ${formatCentimetres(millimetresToCentimetres(minimumMm))} cm` : '';
  const outside = (mm: number) => (minimumMm !== undefined && mm < minimumMm) || (maximumMm !== undefined && mm > maximumMm);
  const rangeMessage = `Zulässig sind ${limits}.`;

  const change = (raw: string) => {
    setDraft(raw);
    setLocalError('');
    if (raw.trim() === '') { onValueChange(null); return; }
    if (!/^\d{1,5}(?:[.,]\d)?$/.test(raw.trim())) return;
    const millimetres = centimetresToMillimetres(Number(raw.replace(',', '.')));
    if (millimetres === null) return;
    if (outside(millimetres)) { setLocalError(rangeMessage); return; }
    onValueChange(millimetres);
  };
  const blur = () => {
    const trimmed = draft.trim();
    if (trimmed && !/^\d{1,5}(?:[.,]\d)?$/.test(trimmed)) {
      setLocalError('Bitte ein Maß in cm mit höchstens einer Nachkommastelle eingeben.');
      return;
    }
    const millimetres = trimmed ? centimetresToMillimetres(Number(trimmed.replace(',', '.'))) : null;
    if (millimetres !== null && outside(millimetres)) {
      // The rejected entry is dropped; the field shows the last accepted value again.
      setDraft(valueMm === null ? '' : formatCentimetres(millimetresToCentimetres(valueMm)));
      setLocalError(rangeMessage);
      return;
    }
    setLocalError('');
  };
  const step = (direction: 1 | -1) => {
    const base = valueMm ?? minimumMm ?? 0;
    const next = base + direction * stepMm;
    if (outside(next)) { setLocalError(rangeMessage); return; }
    setLocalError('');
    onValueChange(next);
  };
  const canStep = (direction: 1 | -1) => valueMm !== null && !outside(valueMm + direction * stepMm);
  const message = localError || error;
  return (
    <div className={`dimension-field ${message ? 'dimension-field--error' : ''} ${wide ? 'form-grid__wide' : ''}`}>
      <div className="dimension-field__label-row">
        <label className="dimension-field__label" htmlFor={id}>{label}</label>
        {limits && <span className="dimension-field__limit">{limits}</span>}
      </div>
      <div className="dimension-field__control dimension-field__control--stepper">
        <button type="button" className="dimension-field__step" aria-label={`${label} um 1 cm verringern`}
          disabled={!canStep(-1)} onClick={() => step(-1)}>−</button>
        <input id={id} className="dimension-field__input" type="text" inputMode="decimal" autoComplete="off"
          value={draft} onChange={(event) => change(event.currentTarget.value)} onBlur={blur}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          aria-invalid={Boolean(message)} aria-describedby={`${id}-message`} />
        <span className="dimension-field__unit">cm</span>
        <button type="button" className="dimension-field__step" aria-label={`${label} um 1 cm erhöhen`}
          disabled={!canStep(1)} onClick={() => step(1)}>+</button>
      </div>
      <p id={`${id}-message`} className={message ? 'dimension-field__error' : 'dimension-field__help'}>
        {message || help}
      </p>
    </div>
  );
}

function formatCentimetres(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, useGrouping: false }).format(value);
}
