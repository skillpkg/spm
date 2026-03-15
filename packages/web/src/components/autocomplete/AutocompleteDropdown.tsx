import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text, TrustBadge, type TrustTier } from '@spm/ui';
import type { AutocompleteItem } from '../../hooks/useSearchAutocomplete';

interface AutocompleteDropdownProps {
  items: AutocompleteItem[];
  emptyMessage: string | null;
  /** Visual variant — hero uses slightly larger padding */
  variant?: 'hero' | 'compact';
  onSelect?: () => void;
}

export const AutocompleteDropdown = forwardRef<HTMLDivElement, AutocompleteDropdownProps>(
  ({ items, emptyMessage, variant = 'hero', onSelect }, ref) => {
    const navigate = useNavigate();
    const isCompact = variant === 'compact';
    const pad = isCompact ? '8px 12px' : '10px 16px';

    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: 'var(--color-bg-card)',
      border: isCompact ? '1px solid var(--color-border-default)' : '1.5px solid #10b981',
      borderTop: 'none',
      borderRadius: isCompact ? '0 0 8px 8px' : '0 0 10px 10px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      zIndex: 50,
      overflow: 'hidden',
    };

    if (items.length === 0 && emptyMessage) {
      return (
        <div ref={ref} style={containerStyle}>
          <Text
            variant="body-sm"
            font="sans"
            color="muted"
            as="div"
            style={{ padding: '16px', textAlign: 'center' }}
          >
            {emptyMessage}
          </Text>
        </div>
      );
    }

    if (items.length === 0) return null;

    return (
      <div ref={ref} style={containerStyle}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              padding: pad,
              borderBottom: '1px solid #1a1d2744',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              navigate(item.navigateTo);
              onSelect?.();
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(16,185,129,0.04)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 8 }}>
              {item.icon && <span style={{ fontSize: isCompact ? 14 : 16 }}>{item.icon}</span>}
              <Text
                variant={isCompact ? 'body-sm' : 'body'}
                font="mono"
                weight={600}
                as="span"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {item.label}
              </Text>
              {item.badge && <TrustBadge tier={item.badge.trust_tier as TrustTier} />}
            </div>
            <Text
              variant="label"
              font="mono"
              color="muted"
              as="span"
              style={{ whiteSpace: 'nowrap' }}
            >
              {item.sublabel}
            </Text>
          </div>
        ))}
      </div>
    );
  },
);

AutocompleteDropdown.displayName = 'AutocompleteDropdown';
