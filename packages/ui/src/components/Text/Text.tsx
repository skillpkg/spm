import type { CSSProperties, ElementType, ReactNode } from 'react';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'tiny';

export type TextColor = 'primary' | 'secondary' | 'dim' | 'muted' | 'faint' | 'accent' | 'inherit';

export type TextFont = 'sans' | 'mono';

export interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  font?: TextFont;
  as?: ElementType;
  weight?: CSSProperties['fontWeight'];
  align?: CSSProperties['textAlign'];
  truncate?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<
  TextVariant,
  { fontSize: number; fontWeight: number; lineHeight: number; defaultTag: ElementType }
> = {
  display: { fontSize: 42, fontWeight: 800, lineHeight: 1.1, defaultTag: 'h1' },
  h1: { fontSize: 24, fontWeight: 700, lineHeight: 1.25, defaultTag: 'h1' },
  h2: { fontSize: 20, fontWeight: 700, lineHeight: 1.3, defaultTag: 'h2' },
  h3: { fontSize: 16, fontWeight: 600, lineHeight: 1.4, defaultTag: 'h3' },
  h4: { fontSize: 15, fontWeight: 600, lineHeight: 1.4, defaultTag: 'h4' },
  body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5, defaultTag: 'p' },
  'body-sm': { fontSize: 13, fontWeight: 400, lineHeight: 1.5, defaultTag: 'p' },
  caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.5, defaultTag: 'span' },
  label: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, defaultTag: 'span' },
  tiny: { fontSize: 10, fontWeight: 400, lineHeight: 1.4, defaultTag: 'span' },
};

const COLOR_MAP: Record<TextColor, string> = {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  dim: 'var(--color-text-dim)',
  muted: 'var(--color-text-muted)',
  faint: 'var(--color-text-faint)',
  accent: 'var(--color-accent)',
  inherit: 'inherit',
};

const FONT_MAP: Record<TextFont, string> = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
};

export const Text = ({
  variant = 'body',
  color,
  font,
  as,
  weight,
  align,
  truncate,
  style,
  children,
  ...rest
}: TextProps & Record<string, unknown>) => {
  const v = VARIANT_STYLES[variant];
  const Tag = as ?? v.defaultTag;

  const baseStyle: CSSProperties = {
    fontSize: v.fontSize,
    fontWeight: weight ?? v.fontWeight,
    lineHeight: v.lineHeight,
    fontFamily: font ? FONT_MAP[font] : undefined,
    color: color ? COLOR_MAP[color] : undefined,
    textAlign: align,
    margin: 0,
    ...(truncate
      ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
      : undefined),
    ...style,
  };

  return (
    <Tag style={baseStyle} {...rest}>
      {children}
    </Tag>
  );
};
