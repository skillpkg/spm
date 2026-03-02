import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SkillDetail } from '../pages/SkillDetail';
import { SKILLS_DB } from '../data/mock';

const renderSkillDetail = (name: string) =>
  render(
    <MemoryRouter initialEntries={[`/skills/${name}`]}>
      <Routes>
        <Route path="/skills/:name" element={<SkillDetail />} />
      </Routes>
    </MemoryRouter>,
  );

const pdfSkill = SKILLS_DB.find((s) => s.name === 'pdf')!;

describe('SkillDetail', () => {
  it('renders skill name and version', () => {
    renderSkillDetail('pdf');

    expect(screen.getByRole('heading', { name: 'pdf' })).toBeInTheDocument();
    expect(screen.getByText(pdfSkill.version)).toBeInTheDocument();
  });

  it('shows install command with skill name', () => {
    renderSkillDetail('pdf');

    expect(screen.getByText(`spm install pdf`)).toBeInTheDocument();
  });

  it('renders README/Versions/Security tabs', () => {
    renderSkillDetail('pdf');

    expect(screen.getByRole('button', { name: 'README' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Versions (${pdfSkill.versions.length})` }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
  });

  it('shows "Skill not found" for unknown skill name', () => {
    renderSkillDetail('nonexistent-skill-xyz');

    expect(screen.getByText('Skill not found')).toBeInTheDocument();
  });

  it('displays skill description', () => {
    renderSkillDetail('pdf');

    expect(screen.getByText(pdfSkill.desc)).toBeInTheDocument();
  });
});
