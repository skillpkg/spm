import { useState } from 'react';
import { Text } from '@spm/ui';
import { type SkillFull } from './types';

const README_COLLAPSED_LINES = 15;

export const ReadmeTab = ({ skill }: { skill: SkillFull }) => {
  const [expanded, setExpanded] = useState(false);

  if (skill.readmeMd) {
    const lines = skill.readmeMd.split('\n');
    const isCollapsible = lines.length > README_COLLAPSED_LINES;
    const collapsed = isCollapsible && !expanded;
    const displayedText = collapsed
      ? lines.slice(0, README_COLLAPSED_LINES).join('\n')
      : skill.readmeMd;

    return (
      <div style={{ paddingTop: 4 }}>
        <Text
          variant="body-sm"
          font="mono"
          color="secondary"
          as="pre"
          style={{
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}
        >
          {displayedText}
        </Text>
        {collapsed && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue, #3b82f6)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0 0',
              display: 'block',
            }}
          >
            Show more ({lines.length - README_COLLAPSED_LINES} more lines)
          </button>
        )}
        {expanded && isCollapsible && (
          <button
            onClick={() => setExpanded(false)}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--color-blue, #3b82f6)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0 0',
              display: 'block',
            }}
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  return (
    <Text
      variant="body"
      font="sans"
      color="secondary"
      as="div"
      style={{
        lineHeight: 1.75,
        paddingTop: 4,
      }}
    >
      {skill.longDesc?.split('\n\n').map((para, i) => (
        <p key={i} style={{ marginBottom: 16 }}>
          {para}
        </p>
      ))}
    </Text>
  );
};
