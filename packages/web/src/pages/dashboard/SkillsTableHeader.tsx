import { Text } from '@spm/ui';

export const SkillsTableHeader = () => (
  <Text
    variant="label"
    font="sans"
    color="muted"
    as="div"
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 100px 100px 90px 80px',
      padding: '8px 18px',
      borderBottom: '1px solid var(--color-border-default)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}
  >
    <span>Skill</span>
    <span style={{ textAlign: 'right' }}>Downloads</span>
    <span style={{ textAlign: 'right' }}>Rating</span>
    <span style={{ textAlign: 'right' }}>Trust</span>
    <span style={{ textAlign: 'right' }}>Updated</span>
  </Text>
);
