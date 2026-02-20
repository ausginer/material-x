import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import './theme.css';
import './preview-frame.css';

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
    backgrounds: {
      default: 'surface',
      values: [
        {
          name: 'surface',
          value: 'var(--md-sys-color-surface)',
        },
      ],
    },
  },
  initialGlobals: {
    backgrounds: { value: 'surface' },
  },
};

export default preview;
