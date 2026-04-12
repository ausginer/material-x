import { MoonIcon, SunIcon } from '@storybook/icons';
import React from 'react';
import { Button } from 'storybook/internal/components';
import {
  addons,
  types,
  useAddonState,
  useChannel,
} from 'storybook/manager-api';

const ADDON_ID = 'theme-toggle';
export const THEME_EVENT = 'THEME_CHANGED';
const THEME_PARAM = 'theme';

type Theme = 'light' | 'dark';

function getUrlTheme(): Theme {
  return new URL(window.location.href).searchParams.get(THEME_PARAM) === 'dark'
    ? 'dark'
    : 'light';
}

function setUrlTheme(theme: Theme): void {
  const url = new URL(window.location.href);
  url.searchParams.set(THEME_PARAM, theme);
  window.history.replaceState(null, '', url);
}

function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useAddonState<Theme>(ADDON_ID, getUrlTheme());

  const emit = useChannel({
    [THEME_EVENT]: (next: Theme) => {
      setTheme(next);
      setUrlTheme(next);
    },
  });

  return (
    <Button
      variant="ghost"
      ariaLabel="Toggle theme"
      tooltip={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        setUrlTheme(next);
        emit(THEME_EVENT, next);
      }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(ADDON_ID, {
    type: types.TOOL,
    title: 'Theme',
    match: () => true,
    render: ThemeToggle,
  });
});
