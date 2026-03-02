import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card = ({ children, className = '', style }: CardProps) => (
  <div
    className={className}
    style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 10,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);
