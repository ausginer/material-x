import type { Preview } from '@storybook/web-components-vite';
// eslint-disable-next-line import-x/no-unassigned-import
import '../src/core/styles.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
