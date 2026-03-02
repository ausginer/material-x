import type { JSX, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

type ThemeName = 'light' | 'dark';

function getCurrentThemeName(): ThemeName {
  if (typeof document === 'undefined') {
    return 'light';
  }

  return document.documentElement.dataset['theme'] === 'dark'
    ? 'dark'
    : 'light';
}

function getToggledThemeName(theme: ThemeName): ThemeName {
  return theme === 'dark' ? 'light' : 'dark';
}

function getStorybookHref(): string {
  if (typeof window === 'undefined') {
    return '#';
  }

  try {
    if (window.top?.location.href) {
      return window.top.location.href;
    }
  } catch {
    // Ignore cross-origin access errors and use iframe URL fallback.
  }

  return window.location.href;
}

function buildThemeToggleHref(nextTheme: ThemeName): string {
  if (typeof window === 'undefined') {
    return '#';
  }

  const url = new URL(getStorybookHref());
  const globals = url.searchParams.get('globals');
  const globalEntries = new Map<string, string>();

  if (globals) {
    for (const entry of globals.split(';')) {
      const separatorIndex = entry.indexOf(':');

      if (separatorIndex <= 0) {
        continue;
      }

      const key = entry.slice(0, separatorIndex);
      const value = entry.slice(separatorIndex + 1);

      if (!key) {
        continue;
      }

      globalEntries.set(key, value);
    }
  }

  globalEntries.set('theme', nextTheme);

  const nextGlobals = Array.from(
    globalEntries.entries(),
    ([key, value]) => `${key}:${value}`,
  ).join(';');

  url.searchParams.set('globals', nextGlobals);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function ThemeToggleLink({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [theme, setTheme] = useState<ThemeName>(() => getCurrentThemeName());
  const href = useMemo(
    () => buildThemeToggleHref(getToggledThemeName(theme)),
    [theme],
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(getCurrentThemeName());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <mx-link-button color="outlined" size="xsmall" href={href} target="_top">
      {children}
    </mx-link-button>
  );
}
