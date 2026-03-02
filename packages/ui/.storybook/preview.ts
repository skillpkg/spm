import type { Preview } from '@storybook/react';
import './storybook.css';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Atoms', 'Molecules'],
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#080a0f' },
        { name: 'card', value: '#0d1017' },
      ],
    },
  },
};

export default preview;
