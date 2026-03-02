import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import './preview-frame.css';
import './theme.css';
import { DocsContainer } from './docs/DocsContainer.tsx';

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    docs: {
      container: DocsContainer,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
