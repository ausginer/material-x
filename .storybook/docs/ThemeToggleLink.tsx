/* eslint-disable import-x/no-relative-packages */
// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="../../packages/material-x/src/react.ts" />

import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { addons } from 'storybook/preview-api';
import { THEME_EVENT } from '../preview.ts';
import '../../packages/material-x/src/button/button.ts';

type Theme = 'light' | 'dark';

function getTheme(): Theme {
  return document.documentElement.dataset['theme'] === 'dark'
    ? 'dark'
    : 'light';
}

export function ThemeToggleLink({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <mx-button
      color="outlined"
      size="xsmall"
      onClick={() => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        addons.getChannel().emit(THEME_EVENT, next);
      }}
    >
      {children}
    </mx-button>
  );
}
