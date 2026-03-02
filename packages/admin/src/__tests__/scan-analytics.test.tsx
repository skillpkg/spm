import { render, screen } from '@testing-library/react';
import { ScanAnalytics } from '../components/ScanAnalytics';
import { SCAN_STATS } from '../data/mock';

describe('ScanAnalytics', () => {
  it('renders "Total publishes" stat with value 847', () => {
    render(<ScanAnalytics />);
    expect(screen.getByText('Total publishes')).toBeInTheDocument();
    expect(screen.getByText(String(SCAN_STATS.total))).toBeInTheDocument();
  });

  it('renders "Passed" stat with value 791', () => {
    render(<ScanAnalytics />);
    // "Passed" appears in both the stat box label and the outcome breakdown legend
    const passedElements = screen.getAllByText('Passed');
    expect(passedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(String(SCAN_STATS.passed))).toBeInTheDocument();
  });

  it('renders "Blocked" stat with value 38', () => {
    render(<ScanAnalytics />);
    // "Blocked" also appears in both stat box and outcome breakdown
    const blockedElements = screen.getAllByText('Blocked');
    expect(blockedElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(String(SCAN_STATS.blocked))).toBeInTheDocument();
  });

  it('renders "Outcome breakdown" section with percentages', () => {
    render(<ScanAnalytics />);
    expect(screen.getByText('Outcome breakdown')).toBeInTheDocument();
    // Verify computed breakdown percentages are rendered in the legend.
    // Some percentages may also appear in the block rate chart, so use getAllByText.
    const passRate = ((SCAN_STATS.passed / SCAN_STATS.total) * 100).toFixed(1);
    const blockRate = ((SCAN_STATS.blocked / SCAN_STATS.total) * 100).toFixed(1);
    const holdRate = ((SCAN_STATS.held / SCAN_STATS.total) * 100).toFixed(1);
    expect(screen.getAllByText(`${passRate}%`).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(`${blockRate}%`).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(`${holdRate}%`).length).toBeGreaterThanOrEqual(1);
  });
});
