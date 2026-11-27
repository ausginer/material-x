import type { Preview } from '@storybook/react-vite';
import { GLOBALS_UPDATED } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';
import './preview-frame.css';
import './theme.css';
import { DocsContainer } from './docs/DocsContainer.tsx';

/**
 * The Storybook global that holds the reader's theme, `light` or `dark`.
 * Storybook carries it in the manager's URL, through navigation and reload.
 */
export const THEME_GLOBAL = 'theme';

type Globals = Readonly<Record<string, unknown>>;

function applyTheme(globals: Globals): void {
  document.documentElement.dataset['theme'] =
    globals[THEME_GLOBAL] === 'dark' ? 'dark' : 'light';
}

// Storybook reports the globals on this event for every story render, every
// docs render and every update, so it themes a docs page and a page without
// a story, which run no decorator.
addons.getChannel().on(GLOBALS_UPDATED, ({ globals }: { globals: Globals }) => {
  applyTheme(globals);
});

const preview: Preview = {
  // Naming the global here lets Storybook accept it from the URL, and drop it
  // from the URL for light.
  initialGlobals: { [THEME_GLOBAL]: 'light' },
  parameters: {
    docs: {
      container: DocsContainer,
      codePanel: true,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
