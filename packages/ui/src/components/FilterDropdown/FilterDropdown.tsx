import { useState } from 'react';
import { resolveColor, withAlpha } from '../../utils/colors';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  color?: string;
}

export const FilterDropdown = ({ label, value, options, onChange, color }: FilterDropdownProps) => {
  const [open, setOpen] = useState(false);
  const hasValue = value !== 'all';
  const activeColor = color ?? 'accent';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          padding: '6px 12px',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${hasValue ? withAlpha(activeColor, 0.25) : 'var(--color-border-default)'}`,
          backgroundColor: hasValue ? withAlpha(activeColor, 0.05) : 'var(--color-bg-card)',
          color: hasValue ? resolveColor(activeColor) : 'var(--color-text-dim)',
        }}
      >
        {label} <span style={{ fontSize: 10, opacity: 0.6 }}>&#x25BE;</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              zIndex: 51,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              minWidth: 140,
              overflow: 'hidden',
            }}
          >
            {options.map((opt) => {
              const isActive = value === opt.value;
              const optColor = opt.color ?? 'accent';
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: isActive ? resolveColor(optColor) : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? withAlpha(optColor, 0.05) : 'transparent',
                  }}
                >
                  {opt.label}
                  {isActive && <span style={{ fontSize: 11 }}>&#x2713;</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
