import type { Preview } from '@storybook/react-vite';
import { addons } from 'storybook/preview-api';
import './preview-frame.css';
import './theme.css';
import { DocsContainer } from './docs/DocsContainer.tsx';

export const THEME_EVENT = 'THEME_CHANGED';
const THEME_PARAM = 'theme';

type Theme = 'light' | 'dark';

function getTopUrlTheme(): Theme {
  try {
    const href = window.top?.location.href ?? window.location.href;
    return new URL(href).searchParams.get(THEME_PARAM) === 'dark'
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

function setTopUrlTheme(theme: Theme): void {
  try {
    const { top } = window;
    if (!top) return;
    const url = new URL(top.location.href);
    url.searchParams.set(THEME_PARAM, theme);
    top.history.replaceState(null, '', url);
  } catch {
    // cross-origin — ignore
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  setTopUrlTheme(theme);
}

addons.getChannel().on(THEME_EVENT, (theme: Theme) => {
  applyTheme(theme);
});

const preview: Preview = {
  decorators: [
    (Story) => {
      applyTheme(getTopUrlTheme());
      return Story();
    },
  ],
  parameters: {
    docs: {
      container: DocsContainer,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
