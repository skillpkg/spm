import { resolveColor, withAlpha } from '../../utils/colors';

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  countColor?: string;
}

export interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

/** @deprecated Use `Tabs` from `@spm/ui/shadcn` instead */
export const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <div
    style={{
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid var(--color-border-default)',
      marginBottom: 20,
      overflowX: 'auto',
    }}
  >
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 500,
          padding: '10px 18px',
          border: 'none',
          borderBottom:
            active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
          background: 'transparent',
          color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          cursor: 'pointer',
          marginBottom: -1,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {tab.label}
        {tab.count != null && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              backgroundColor: withAlpha(tab.countColor ?? 'accent', 0.1),
              color: resolveColor(tab.countColor ?? 'accent'),
            }}
          >
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);
