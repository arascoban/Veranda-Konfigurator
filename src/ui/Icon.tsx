import type { ReactNode, SVGProps } from 'react';

export type IconName = 'arrow-left' | 'arrow-right' | 'chevron-down' | 'close' | 'save' | 'open'
  | 'undo' | 'redo' | 'reset' | 'measure' | 'check' | 'info' | 'warning' | 'error'
  | 'clock' | 'roof' | 'sun' | 'plus' | 'minus' | 'external';

const paths: Record<IconName, ReactNode> = {
  'arrow-left': <path d="M19 12H5m7 7-7-7 7-7" />,
  'arrow-right': <path d="M5 12h14m-7-7 7 7-7 7" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  save: <><path d="M5 4h12l3 3v13H4V4z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>,
  open: <><path d="M12 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M14 3h7v7m0-7-9 9" /></>,
  undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 0 14h-2" /></>,
  redo: <><path d="m15 14 5-5-5-5"/><path d="M20 9h-9a7 7 0 0 0 0 14h2" /></>,
  reset: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5l3 5" /></>,
  measure: <><path d="M4 20V4m0 16h16"/><path d="M8 16v-3m4 3V9m4 7v-5m4 5v-3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  warning: <><path d="M12 3 2.7 19h18.6L12 3z"/><path d="M12 9v4m0 3h.01"/></>,
  error: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  roof: <path d="m3 11 9-7 9 7M5 10v10h14V10M9 20v-6h6v6" />,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  plus: <path d="M12 5v14m-7-7h14"/>,
  minus: <path d="M5 12h14"/>,
  external: <><path d="M14 4h6v6m0-6-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
};

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" focusable="false" {...props}>
      {paths[name]}
    </svg>
  );
}
