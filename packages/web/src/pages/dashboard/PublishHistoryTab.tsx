import { cardStyle } from './styles';

export const PublishHistoryTab = () => (
  <div>
    <div style={cardStyle}>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--color-text-dim)',
          }}
        >
          No publish history yet
        </div>
      </div>
    </div>
  </div>
);
