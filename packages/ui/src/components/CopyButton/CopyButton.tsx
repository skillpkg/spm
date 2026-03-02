import { useState } from 'react';

export interface CopyButtonProps {
  text: string;
}

export const CopyButton = ({ text }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  return (
    <span
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        cursor: 'pointer',
        padding: '2px 6px',
        userSelect: 'none',
        color: copied ? '#10b981' : '#64748b',
      }}
    >
      {copied ? '\u2713 copied' : 'copy'}
    </span>
  );
};
