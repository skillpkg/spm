import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  it('renders "copy" text by default', () => {
    render(<CopyButton text="spm install pdf" />);
    expect(screen.getByText('copy')).toBeInTheDocument();
  });

  it('calls clipboard.writeText on click', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyButton text="spm install pdf" />);
    fireEvent.click(screen.getByText('copy'));
    expect(writeText).toHaveBeenCalledWith('spm install pdf');
  });

  it('shows copied state after click', () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    render(<CopyButton text="test" />);
    fireEvent.click(screen.getByText('copy'));
    expect(screen.getByText('\u2713 copied')).toBeInTheDocument();
  });
});
