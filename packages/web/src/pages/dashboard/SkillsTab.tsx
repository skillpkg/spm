import { type Skill } from './types';
import { SkillRow } from './SkillRow';
import { SkillsTableHeader } from './SkillsTableHeader';
import { cardStyle } from './styles';

export const SkillsTab = ({ skills: skillsList }: { skills: Skill[] }) => (
  <div style={cardStyle}>
    <SkillsTableHeader />
    {skillsList.map((s) => (
      <SkillRow key={s.name} skill={s} />
    ))}
  </div>
);
