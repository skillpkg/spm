import { type SkillFull, cardStyle } from './types';

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
            Signing happens automatically during{' '}
            <code style={{ fontSize: 12 }}>spm publish</code> when Sigstore is reachable.
            Re-publish a new version to sign it.
          </div>
        </div>
      )}
    </div>

    {/* Scan results */}
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
        &#x1F6E1; Scan Results
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {skill.security.layers?.map((layer, i) => (
          <div
            key={i}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-accent)',
            }}
          >
            &#x2713; {layer}
          </div>
        ))}
      </div>
    </div>
  </div>
);
