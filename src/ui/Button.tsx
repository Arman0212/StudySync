import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ variant = 'secondary', icon, children, className = '', size, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string; size?: 'sm'; children?: ReactNode }) {
  return (
    <button type="button" className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`.trim()} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children != null && <span>{children}</span>}
    </button>
  );
}
