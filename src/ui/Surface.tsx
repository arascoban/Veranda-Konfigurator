import type { HTMLAttributes, ReactNode } from 'react';

export function GlassSurface({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`glass-surface ${className}`.trim()} {...props}>{children}</div>;
}
