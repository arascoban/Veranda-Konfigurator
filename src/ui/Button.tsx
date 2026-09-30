import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'normal' | 'small';
  icon?: IconName;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function Button({ variant = 'secondary', size = 'normal', icon, className = '', children, ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()} {...props}>
      {icon && <Icon className="ui-button__icon" name={icon} />}
      <span>{children}</span>
    </button>
  );
}
