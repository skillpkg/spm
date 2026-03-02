import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="px-8 py-4 border-t border-border-default flex justify-between items-center">
      <div className="flex items-center gap-3.5">
        <div className="w-[18px] h-[18px] rounded bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center font-mono text-[9px] font-bold text-bg">
          S
        </div>
        <span className="font-mono text-sm text-accent font-semibold">spm</span>
        <span className="font-mono text-[11px] text-text-faint">Skills Package Manager</span>
      </div>
      <div className="flex gap-[18px]">
        {(['Docs', 'GitHub', 'Status', 'Discord'] as const).map((item) => (
          <Link
            key={item}
            to="#"
            className="font-sans text-xs text-text-muted no-underline hover:text-text-dim transition-colors"
          >
            {item}
          </Link>
        ))}
      </div>
    </footer>
  );
};
