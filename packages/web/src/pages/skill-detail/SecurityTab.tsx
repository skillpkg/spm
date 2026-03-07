import { SecurityBadge } from '@spm/ui';
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
    default:
      return 'skipped';
  }
};

export const SecurityTab = ({ skill }: { skill: SkillFull }) => (
  <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {/* Signature */}
    <div style={{ ...cardStyle, marginBottom: 0 }}>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 10,
        }}
      >
        {skill.security.signed ? '\uD83D\uDD12' : '\u26A0'} Signature
      </div>
      {skill.security.signed ? (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-accent)',
          }}
        >
          &#x2713; Signed by {skill.security.signer} (Sigstore OIDC)
        </div>
      ) : (
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-yellow)',
            }}
          >
            &#x26A0; Unsigned — this version was published without a signature
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--color-text-dim)',
              marginTop: 6,
            }}
          >
            Signing happens automatically during <code style={{ fontSize: 12 }}>spm publish</code>{' '}
            when Sigstore is reachable. Re-publish a new version to sign it.
          </div>
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
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          &#x1F6E1; Security Scan
        </div>
        <SecurityBadge level={skill.security.level} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {skill.security.layers.length > 0 ? (
          skill.security.layers.map((layer) => {
            const icon = layerStatusIcon(layer.status);
            return (
              <div
                key={layer.layer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: icon.color, flexShrink: 0 }}>{icon.symbol}</span>
                <span style={{ color: 'var(--color-text-dim)' }}>
                  Layer {layer.layer}: {layer.name}
                </span>
                <span style={{ color: icon.color, marginLeft: 'auto' }}>
                  {layerStatusLabel(layer.status, layer.confidence)}
                </span>
              </div>
            );
          })
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-text-faint)',
            }}
          >
            No scan data available
          </div>
        )}
      </div>
    </div>
  </div>
);
