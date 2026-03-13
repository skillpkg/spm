import { StatBox, Text } from '@spm/ui';
import { LegacyCard as Card } from '@spm/ui/shadcn';

const SectionHeading = ({ children }: { children: string }) => (
  <Text
    variant="body"
    as="h2"
    weight={600}
    color="secondary"
    style={{ marginBottom: 12, marginTop: 0 }}
  >
    {children}
  </Text>
);

const PlaceholderCard = ({ title, description }: { title: string; description: string }) => (
  <Card style={{ padding: 24, marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>&#x1F6A7;</span>
      <Text variant="body" weight={600} color="primary">
        {title}
      </Text>
    </div>
    <Text variant="body-sm" as="p" color="dim" style={{ margin: 0, lineHeight: 1.6 }}>
      {description}
    </Text>
  </Card>
);

export const OverviewTab = () => (
  <div>
    <SectionHeading>Platform Overview</SectionHeading>
    <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
      <StatBox label="Total skills" value="--" color="accent" />
      <StatBox label="Total users" value="--" color="blue" />
      <StatBox label="Total downloads" value="--" color="cyan" />
      <StatBox label="Queue depth" value="--" color="orange" />
    </div>

    <SectionHeading>Requires Attention</SectionHeading>
    <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
      <StatBox label="Review queue" value="--" color="yellow" />
      <StatBox label="Open reports" value="--" color="red" />
      <StatBox label="Open errors" value="--" color="red" />
      <StatBox label="Blocked skills" value="--" color="red" />
    </div>

    <PlaceholderCard
      title="Publishing & Security Stats — Coming Soon"
      description="Publishing breakdown (published / blocked / rejected), security scan pass rates, and per-layer analysis will be displayed here once the admin stats API is connected."
    />

    <PlaceholderCard
      title="Users by Trust Tier — Coming Soon"
      description="Distribution of users across trust tiers (official, verified, scanned, registered) with visual breakdown."
    />
  </div>
);
