/** Rejects extra precision instead of silently rounding a manufacturing input. */
export function centimetresToMillimetres(valueCm: number): number | null {
  if (!Number.isFinite(valueCm) || valueCm < 0) return null;
  const mm = valueCm * 10;
  if (!Number.isSafeInteger(mm)) return null;
  return mm;
}

export function millimetresToCentimetres(valueMm: number): number {
  return valueMm / 10;
}

/** The only conversion at the viewer boundary. */
export function millimetresToMetres(valueMm: number): number {
  return valueMm / 1000;
}
