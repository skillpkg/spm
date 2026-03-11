import { TopBar, Breadcrumb } from '@spm/ui';
import { TABS_MAP } from './AdminSidebar';

interface AdminTopBarProps {
  activeTab: string;
  onNavigateHome?: () => void;
}

export const AdminTopBar = ({ activeTab, onNavigateHome }: AdminTopBarProps) => {
  const sectionLabel = TABS_MAP[activeTab] ?? 'Overview';

  const items =
    activeTab === 'overview'
      ? [{ label: 'Admin Panel' }]
      : [{ label: 'Admin Panel', href: '#', onClick: onNavigateHome }, { label: sectionLabel }];

  return <TopBar left={<Breadcrumb items={items} />} />;
};
