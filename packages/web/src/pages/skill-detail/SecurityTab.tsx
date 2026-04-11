import { SecurityBadge, Text } from '@spm/ui';
import { type SkillFull, cardStyle } from './types';

const layerStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
    case 'clean':
      return { symbol: '\u2713', color: 'var(--color-accent)' };
    case 'flagged':
      return { symbol: '\u26A0', color: '#eab308' };
    case 'blocked':
      return { symbol: '\u2717', color: '#ef4444' };
    case 'error':
      return { symbol: '\u26A0', color: '#f97316' };
    case 'pending':
      return { symbol: '\u2022', color: 'var(--color-text-muted)' };
    default:
      return { symbol: '\u2014', color: 'var(--color-text-faint)' };
  }
};

const layerStatusLabel = (status: string, confidence: number | null) => {
  switch (status) {
    case 'passed':
    case 'clean':
      return 'passed';
    case 'flagged':
      return confidence != null
        ? `flagged (confidence: ${Math.round(confidence * 100)}%)`
        : 'flagged';
    case 'blocked':
      return 'blocked';
    case 'error':
      return 'error';
    case 'pending':
      return 'pending';
    default:
      return 'skipped';
  }
};

export const SecurityTab = ({ skill }: { skill: SkillFull }) => (
  <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {/* Signature */}
    <div style={{ ...cardStyle, marginBottom: 0 }}>
      <Text
        variant="body-sm"
        font="sans"
        color="primary"
        weight={600}
        as="div"
        style={{ marginBottom: 10 }}
      >
        {skill.security.signed ? '\uD83D\uDD12' : '\u26A0'} Signature
      </Text>
      {skill.security.signed ? (
        <Text variant="body-sm" font="mono" color="accent" as="div">
          &#x2713; Signed
          {skill.security.signer && skill.security.signer !== 'unknown'
            ? ` by ${skill.security.signer}`
            : ''}{' '}
          (Sigstore OIDC)
        </Text>
      ) : (
        <div>
          <Text variant="body-sm" font="mono" as="div" style={{ color: 'var(--color-yellow)' }}>
            &#x26A0; Unsigned — this version was published without a signature
          </Text>
          <Text variant="caption" font="sans" color="dim" as="div" style={{ marginTop: 6 }}>
            Signing happens automatically during <code style={{ fontSize: 12 }}>spm publish</code>{' '}
            when Sigstore is reachable. Re-publish a new version to sign it.
          </Text>
        </div>
      )}
    </div>

    {/* Scan results */}
    <div style={{ ...cardStyle, marginBottom: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Text variant="body-sm" font="sans" color="primary" weight={600} as="div">
          &#x1F6E1; Security Scan
        </Text>
        <SecurityBadge level={skill.security.level} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {skill.security.layers.length > 0 ? (
          skill.security.layers.map((layer) => {
            const icon = layerStatusIcon(layer.status);
            return (
              <Text
                key={layer.layer}
                variant="body-sm"
                font="mono"
                as="div"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: icon.color, flexShrink: 0 }}>{icon.symbol}</span>
                <span style={{ color: 'var(--color-text-dim)' }}>
                  Layer {layer.layer}: {layer.name}
                </span>
                <span style={{ color: icon.color, marginLeft: 'auto' }}>
                  {layerStatusLabel(layer.status, layer.confidence)}
                </span>
                {layer.status === 'error' && layer.detail && (
                  <Text
                    variant="label"
                    font="mono"
                    color="faint"
                    as="span"
                    style={{
                      marginLeft: 8,
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={layer.detail}
                  >
                    ({layer.detail})
                  </Text>
                )}
              </Text>
            );
          })
        ) : (
          <Text variant="body-sm" font="mono" color="faint" as="div">
            No scan data available
          </Text>
        )}
      </div>
    </div>
  </div>
);
