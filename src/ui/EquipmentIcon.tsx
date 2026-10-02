import type { ReactNode, SVGProps } from 'react';
import type { EquipmentKind } from '../domain/fieldEquipment';

/**
 * Line icons for the five equipment kinds (radial menu, Ausstattung cards). Stand-ins drawn for V2;
 * the owner will supply final icons (chat 2 Oct 2026) — replace the paths here only.
 */
const paths: Record<EquipmentKind, ReactNode> = {
  glasschiebewand: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M9 4v16M15 4v16" /><path d="M5.5 12h2m9 0h2" /></>,
  aluminiumwand: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 8h18M3 12h18M3 16h18" /></>,
  seitenwand_licht: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M7 8l3 3m1-3 3 3m1-3 3 3M7 14l3 3m1-3 3 3m1-3 3 3" /></>,
  senkrechtmarkise: <><rect x="3" y="3" width="18" height="3.5" rx="1.5" /><path d="M5 6.5V19h14V6.5M9 6.5V19m6-12.5V19" /></>,
  giebeldreieck: <><path d="M3 20h18L3 6z" /><path d="M7 20V9.2m4 10.8v-7.7m4 7.7v-4.6" /></>,
};

export function EquipmentIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: EquipmentKind }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" focusable="false" {...props}>
      {paths[kind]}
    </svg>
  );
}
