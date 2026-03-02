import { useParams, Link } from 'react-router-dom';
import { SKILLS_DB, TRUST_CONFIG } from '../data/mock';
import { TrustBadge } from '../components/TrustBadge';

export const AuthorProfile = () => {
  const { username } = useParams<{ username: string }>();

  const authorSkills = SKILLS_DB.filter((s) => s.author === username);

  if (authorSkills.length === 0) {
    return (
      <div className="max-w-[800px] mx-auto px-8 py-16 text-center">
        <div className="font-sans text-xl text-text-dim mb-4">Author not found</div>
        <Link to="/" className="text-accent no-underline font-sans text-sm">
          Back to registry
        </Link>
      </div>
    );
  }

  const primaryTrust = authorSkills[0].trust;
  const trustInfo = TRUST_CONFIG[primaryTrust];
  const totalDownloads = authorSkills.reduce((sum, s) => {
    const num = parseInt(s.downloads.replace(/,/g, ''), 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="max-w-[800px] mx-auto px-8 py-8">
      {/* Breadcrumb */}
      <div className="py-4 font-sans text-[13px]">
        <Link to="/" className="text-text-dim no-underline hover:text-text-secondary">
          Registry
        </Link>
        <span className="text-text-faint mx-2">/</span>
        <span className="text-text-secondary">@{username}</span>
      </div>

      {/* Author header */}
      <div className="flex items-center gap-4 p-6 bg-bg-card border border-border-default rounded-xl mb-8">
        <div className="w-16 h-16 rounded-xl bg-bg-hover border border-border-default flex items-center justify-center font-mono text-2xl text-text-dim">
          {username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-mono text-xl font-bold text-text-primary m-0">@{username}</h1>
            <TrustBadge tier={primaryTrust} size="lg" />
          </div>
          <div className="flex gap-6 font-mono text-xs text-text-muted mt-2">
            <span>
              {authorSkills.length} skill
              {authorSkills.length !== 1 ? 's' : ''}
            </span>
            <span>&#x2B07; {totalDownloads.toLocaleString()} total downloads</span>
          </div>
        </div>
      </div>

      {/* Skills list */}
      <h2 className="font-sans text-[15px] font-semibold text-text-secondary mb-3">
        Published skills
      </h2>
      <div className="border border-border-default rounded-[10px] overflow-hidden">
        {authorSkills.map((skill) => (
          <Link key={skill.name} to={`/skills/${skill.name}`} className="no-underline block">
            <div className="px-5 py-4 border-b border-[#1a1d2744] hover:bg-bg-hover transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[15px] text-cyan font-semibold">
                    {skill.name}
                  </span>
                  <span className="font-mono text-xs text-text-faint">{skill.version}</span>
                  <TrustBadge tier={skill.trust} />
                </div>
                <div className="flex gap-4 font-mono text-xs text-text-muted">
                  <span>&#x2B07; {skill.downloads}</span>
                  <span className="text-yellow">&#x2605; {skill.rating}</span>
                </div>
              </div>
              <p className="font-sans text-[13px] text-text-dim leading-relaxed">{skill.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
