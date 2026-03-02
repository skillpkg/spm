interface Tab {
  id: string;
  label: string;
}

interface DashboardTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export const DashboardTabs = ({ tabs, active, onChange }: DashboardTabsProps) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--color-border-default)',
        marginBottom: 20,
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
            background: 'transparent',
            cursor: 'pointer',
            marginBottom: -1,
            borderBottom:
              active === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: active === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-dim)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
