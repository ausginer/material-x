import { writeFile } from 'node:fs/promises';
import { root, type JSONModule } from '../utils.ts';
import { camelCaseToKebabCase, COLLATOR, HEADER } from './utils.ts';

export type ColorList = Readonly<Record<string, string>>;

export type ColorSchemes = Readonly<{
  light: ColorList;
  'light-medium-contrast': ColorList;
  'light-high-contrast': ColorList;
  dark: ColorList;
  'dark-medium-contrast': ColorList;
  'dark-high-contrast': ColorList;
}>;

export type ColorPalette = Readonly<{
  primary: ColorList;
  secondary: ColorList;
  tertiary: ColorList;
  neutral: ColorList;
  'neutral-variant': ColorList;
}>;

export type MaterialTheme = Readonly<{
  description: string;
  seed: string;
  coreColors: ColorList;
  extendedColors: [];
  schemes: ColorSchemes;
  palettes: ColorPalette;
}>;

const DEFAULT_THEME_URL = new URL('../default-theme.json', import.meta.url);

export async function loadTheme(): Promise<MaterialTheme> {
  const mod: JSONModule<MaterialTheme> = await import(
    String(DEFAULT_THEME_URL),
    { with: { type: 'json' } }
  );

  return mod.default;
}

const DEFAULT_THEME_SASS_FILE = new URL(
  'src/core/tokens/_md-sys-color.scss',
  root,
);
export async function buildDefaultThemeSass(
  theme: MaterialTheme,
): Promise<void> {
  const themeFlavor = theme.schemes.light;

  const values = Object.entries(themeFlavor)
    .map(([name, value]) => {
      const _name = camelCaseToKebabCase(name);
      return [_name, `var(--md-sys-color-${_name}, ${value});`] as const;
    })
    .toSorted(([a], [b]) => COLLATOR.compare(a, b));

  const contents = values
    .map(([name, value]) => `$${name}: ${value};`)
    .join('\n');

  await writeFile(
    DEFAULT_THEME_SASS_FILE,
    `${HEADER}\n\n${contents}\n`,
    'utf8',
  );
}
