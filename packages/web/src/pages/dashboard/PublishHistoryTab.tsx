import { Text } from '@spm/ui';
import { cardStyle } from './styles';

export const PublishHistoryTab = () => (
  <div>
    <div style={cardStyle}>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Text variant="body" font="sans" color="dim" as="div">
          No publish history yet
        </Text>
      </div>
    </div>
  </div>
);
