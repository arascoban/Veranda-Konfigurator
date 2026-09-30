import { useEffect, useId, useState } from 'react';
import { centimetresToMillimetres, millimetresToCentimetres } from '../../../domain/units';

export function DimensionField({ label, valueMm, help, error, maximumMm, onValueChange, wide = false }: {
  label: string;
  valueMm: number | null;
  help: string;
  error?: string;
  maximumMm?: number;
  onValueChange: (value: number | null) => void;
  wide?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(valueMm === null ? '' : formatCentimetres(millimetresToCentimetres(valueMm)));
  const [localError, setLocalError] = useState('');
  useEffect(() => {
    setDraft(valueMm === null ? '' : formatCentimetres(millimetresToCentimetres(valueMm)));
  }, [valueMm]);

  const change = (raw: string) => {
    setDraft(raw);
    setLocalError('');
    if (raw.trim() === '') { onValueChange(null); return; }
    if (!/^\d{1,5}(?:[.,]\d)?$/.test(raw.trim())) return;
    const millimetres = centimetresToMillimetres(Number(raw.replace(',', '.')));
    if (millimetres !== null) onValueChange(millimetres);
  };
  const blur = () => {
    if (draft.trim() && !/^\d{1,5}(?:[.,]\d)?$/.test(draft.trim())) {
      setLocalError('Bitte ein Maß in cm mit höchstens einer Nachkommastelle eingeben.');
    } else setLocalError('');
  };
  const message = localError || error;
  return (
    <div className={`dimension-field ${message ? 'dimension-field--error' : ''} ${wide ? 'form-grid__wide' : ''}`}>
      <div className="dimension-field__label-row">
        <label className="dimension-field__label" htmlFor={id}>{label}</label>
        {maximumMm !== undefined && <span className="dimension-field__limit">Max. {formatCentimetres(millimetresToCentimetres(maximumMm))} cm</span>}
      </div>
      <div className="dimension-field__control">
        <input id={id} className="dimension-field__input" type="text" inputMode="decimal" autoComplete="off"
          value={draft} onChange={(event) => change(event.currentTarget.value)} onBlur={blur}
          aria-invalid={Boolean(message)} aria-describedby={`${id}-message`} />
        <span className="dimension-field__unit">cm</span>
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
