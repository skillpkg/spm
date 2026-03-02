import { render, screen } from '@testing-library/react';
import { ReportsTab } from '../components/ReportsTab';
import { ErrorsTab } from '../components/ErrorsTab';
import { REPORTS, USER_ERRORS } from '../data/mock';

describe('ReportsTab', () => {
  it('renders "Open reports" stat', () => {
    render(<ReportsTab />);
    const expectedOpen = REPORTS.filter((r) => r.status === 'open').length;
    expect(screen.getByText('Open reports')).toBeInTheDocument();
    expect(screen.getByText(String(expectedOpen))).toBeInTheDocument();
  });

  it('renders all report skill names', () => {
    render(<ReportsTab />);
    for (const report of REPORTS) {
      expect(screen.getByText(report.skill)).toBeInTheDocument();
    }
  });

  it('shows reporter names', () => {
    render(<ReportsTab />);
    for (const report of REPORTS) {
      expect(screen.getByText(`Reported by @${report.reporter}`)).toBeInTheDocument();
    }
  });
});

describe('ErrorsTab', () => {
  it('renders "Open errors" stat', () => {
    render(<ErrorsTab />);
    const expectedOpen = USER_ERRORS.filter((e) => e.status === 'open').length;
    expect(screen.getByText('Open errors')).toBeInTheDocument();
    expect(screen.getByText(String(expectedOpen))).toBeInTheDocument();
  });

  it('renders error messages', () => {
    render(<ErrorsTab />);
    for (const err of USER_ERRORS) {
      expect(screen.getByText(err.error)).toBeInTheDocument();
    }
  });
});
