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
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--color-yellow)',
          }}
        >
          &#x26A0; Unsigned — author has not set up Sigstore signing
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
