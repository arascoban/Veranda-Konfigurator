import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type StatusTone = 'info' | 'pending' | 'success' | 'warning' | 'error';
const statusIcon = { info: 'info', pending: 'clock', success: 'check', warning: 'warning', error: 'error' } as const;

export function StatusMessage({ tone = 'info', title, children, className = '' }: {
  tone?: StatusTone; title?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={`status-message status-message--${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={statusIcon[tone]} className="status-message__icon" />
      <div className="status-message__body">
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
