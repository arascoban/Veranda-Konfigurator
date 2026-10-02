import { useEffect, useRef, useState } from 'react';
import type { EquipmentKind } from '../../domain/fieldEquipment';
import { EquipmentIcon } from '../../ui/EquipmentIcon';

export type RadialOption = {
  kind: EquipmentKind;
  label: string;
  /** available: adds it; present: already in this field (opens the field); disabled: not possible here. */
  state: 'available' | 'present' | 'disabled';
  note?: string;
};

const SIZE = 380;
const CENTER = SIZE / 2;
const OUTER = 172;
const INNER = 64;
const GAP = 7;

function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
}

/** Ring slice from `start` to `end` degrees with a constant gap width between neighbouring slices. */
function slicePath(start: number, end: number): string {
  const outerPad = (GAP / 2 / OUTER) * (180 / Math.PI);
  const innerPad = (GAP / 2 / INNER) * (180 / Math.PI);
  const [ox0, oy0] = polar(OUTER, start + outerPad);
  const [ox1, oy1] = polar(OUTER, end - outerPad);
  const [ix1, iy1] = polar(INNER, end - innerPad);
  const [ix0, iy0] = polar(INNER, start + innerPad);
  return `M${ox0} ${oy0}A${OUTER} ${OUTER} 0 0 1 ${ox1} ${oy1}L${ix1} ${iy1}A${INNER} ${INNER} 0 0 0 ${ix0} ${iy0}Z`;
}

/**
 * Radial equipment menu over the 3D view (V2 design, reference wheel): one slice per kind, dark translucent,
 * the hovered slice in the field blue, close button in the centre. Positioned by its centre in viewer pixels.
 */
export function RadialMenu({ title, options, x, y, scale = 1, onPick, onClose }: {
  title: string; options: RadialOption[]; x: number; y: number; scale?: number;
  onPick: (kind: EquipmentKind) => void; onClose: () => void;
}) {
  const [hovered, setHovered] = useState<EquipmentKind | null>(null);
  const firstRef = useRef<SVGGElement>(null);
  useEffect(() => { firstRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const step = 360 / options.length;
  const size = SIZE * scale;
  return (
    <div className="radial-menu" role="menu" aria-label={`Ausstattung für ${title}`}
      style={{ left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={size} height={size} className="radial-menu__ring">
        {options.map((option, index) => {
          const start = -90 - step / 2 + index * step;
          const active = hovered === option.kind && option.state !== 'disabled';
          return (
            <g key={option.kind} ref={index === 0 ? firstRef : undefined} role="menuitem" tabIndex={0}
              aria-disabled={option.state === 'disabled'} aria-label={`${option.label}${option.note ? ` (${option.note})` : ''}`}
              className={`radial-menu__slice radial-menu__slice--${option.state} ${active ? 'radial-menu__slice--active' : ''}`}
              onPointerEnter={() => setHovered(option.kind)} onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(option.kind)} onBlur={() => setHovered(null)}
              onClick={() => { if (option.state !== 'disabled') onPick(option.kind); }}
              onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && option.state !== 'disabled') { event.preventDefault(); onPick(option.kind); } }}>
              <path d={slicePath(start, start + step)} />
            </g>
          );
        })}
        <g role="menuitem" tabIndex={0} aria-label="Menü schließen" className="radial-menu__close" onClick={onClose}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClose(); } }}>
          <circle cx={CENTER} cy={CENTER} r={52} />
          <path d={`M${CENTER - 12} ${CENTER - 12}l24 24M${CENTER + 12} ${CENTER - 12}l-24 24`} />
        </g>
      </svg>
      {options.map((option, index) => {
        const [lx, ly] = polar((OUTER + INNER) / 2, -90 + index * step);
        return (
          <span key={option.kind} className={`radial-menu__label radial-menu__label--${option.state}`} aria-hidden="true"
            style={{ left: lx * scale, top: ly * scale }}>
            <span className="radial-menu__icon">
              <EquipmentIcon kind={option.kind} />
              {option.state === 'present' && <span className="radial-menu__check">✓</span>}
            </span>
            <span className="radial-menu__text">{option.label}</span>
            {option.note && <span className="radial-menu__note">{option.note}</span>}
          </span>
        );
      })}
      <span className="radial-menu__title">{title}</span>
    </div>
  );
}
