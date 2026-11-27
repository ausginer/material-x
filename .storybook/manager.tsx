import { MoonIcon, SunIcon } from '@storybook/icons';
import React from 'react';
import { Button } from 'storybook/internal/components';
import { addons, types, useGlobals } from 'storybook/manager-api';

const ADDON_ID = 'theme-toggle';

/** The global that `preview.ts` declares and applies. */
const THEME_GLOBAL = 'theme';

function ThemeToggle(): React.JSX.Element {
  const [globals, updateGlobals] = useGlobals();
  const dark = globals[THEME_GLOBAL] === 'dark';

  return (
    <Button
      variant="ghost"
      ariaLabel="Toggle theme"
      tooltip={`Switch to ${dark ? 'light' : 'dark'} theme`}
      onClick={() => {
        updateGlobals({ [THEME_GLOBAL]: dark ? 'light' : 'dark' });
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
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
