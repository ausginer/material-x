import type { Preview } from '@storybook/react-vite';
import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
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

// A docs page renders no decorator of its own, and a page without a story
// none at all, so the preview also applies each global the channel reports.
const channel = addons.getChannel();
channel.on(SET_GLOBALS, ({ globals }: { globals: Globals }) => {
  applyTheme(globals);
});
channel.on(GLOBALS_UPDATED, ({ globals }: { globals: Globals }) => {
  applyTheme(globals);
});

const preview: Preview = {
  globalTypes: {
    [THEME_GLOBAL]: { description: 'The theme of the stories and docs.' },
  },
  initialGlobals: { [THEME_GLOBAL]: 'light' },
  decorators: [
    (Story, { globals }) => {
      applyTheme(globals);
      return Story();
    },
  ],
  parameters: {
    docs: {
      container: DocsContainer,
      codePanel: true,
    },
    backgrounds: { disable: true },
  },
};

export default preview;
