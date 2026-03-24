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
