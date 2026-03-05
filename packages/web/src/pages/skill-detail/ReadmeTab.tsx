import { type SkillFull } from './types';

export const ReadmeTab = ({ skill }: { skill: SkillFull }) => (
  <div
    style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--color-text-secondary)',
      lineHeight: 1.75,
      paddingTop: 4,
    }}
  >
    {skill.longDesc?.split('\n\n').map((para, i) => (
      <p key={i} style={{ marginBottom: 16 }}>
        {para}
      </p>
    ))}
  </div>
);
