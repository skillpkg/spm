import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

const Tabs = TabsPrimitive.Root;

const TABS_STYLE_ID = 'spm-tabs-active-style';

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ style, ...props }, ref) => {
  React.useEffect(() => {
    if (document.getElementById(TABS_STYLE_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = TABS_STYLE_ID;
    styleEl.textContent = `
      [data-spm-tab][data-state="active"] {
        border-bottom-color: var(--color-accent) !important;
        color: var(--color-text-primary) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  return (
    <TabsPrimitive.List
      ref={ref}
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--color-border-default)',
        marginBottom: 20,
        overflowX: 'auto',
        ...style,
      }}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ style, ...props }, ref) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-spm-tab=""
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        padding: '10px 18px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        border: 'none',
        borderBottom: '2px solid transparent',
        marginBottom: -1,
        background: 'transparent',
        color: hovered ? 'var(--color-text-secondary)' : 'var(--color-text-dim)',
        cursor: 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
        ...style,
      }}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ ...props }, ref) => <TabsPrimitive.Content ref={ref} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
