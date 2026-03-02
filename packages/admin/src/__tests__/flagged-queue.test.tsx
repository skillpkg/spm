import { render, screen } from '@testing-library/react';
import { FlaggedQueue } from '../components/FlaggedQueue';
import { FLAGGED_QUEUE } from '../data/mock';

describe('FlaggedQueue', () => {
  it('renders "In queue" stat with correct count', () => {
    render(<FlaggedQueue />);
    expect(screen.getByText('In queue')).toBeInTheDocument();
    expect(screen.getByText(String(FLAGGED_QUEUE.length))).toBeInTheDocument();
  });

  it('renders all flagged skill names', () => {
    render(<FlaggedQueue />);
    for (const item of FLAGGED_QUEUE) {
      expect(screen.getByText(item.skill)).toBeInTheDocument();
    }
  });

  it('shows flag type and confidence for each item', () => {
    render(<FlaggedQueue />);
    for (const item of FLAGGED_QUEUE) {
      for (const flag of item.flags) {
        const confidencePct = (flag.confidence * 100).toFixed(0);
        const flagText = `L${flag.layer}: ${flag.type} (${confidencePct}%)`;
        expect(screen.getByText(flagText)).toBeInTheDocument();
      }
    }
  });

  it('renders "Avg review time" stat', () => {
    render(<FlaggedQueue />);
    expect(screen.getByText('Avg review time')).toBeInTheDocument();
    expect(screen.getByText('4.2h')).toBeInTheDocument();
  });

  it('renders "False positive rate" stat', () => {
    render(<FlaggedQueue />);
    expect(screen.getByText('False positive rate')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});
