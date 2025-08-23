import type { CanonicalizeContext } from 'sass-embedded';
import type { CubicBezier, TokenColor } from './token-loader/TokenTable.ts';

export const root: URL = new URL('../', import.meta.url);

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export const TokenValueType = {
  COLOR: 'COLOR',
  LENGTH: 'LENGTH',
  OPACITY: 'OPACITY',
  SHAPE: 'SHAPE',
  LINE_HEIGHT: 'LINE_HEIGHT',
  FONT_SIZE: 'FONT_SIZE',
  FONT_WEIGHT: 'FONT_WEIGHT',
  FONT_NAMES: 'FONT_NAMES',
  TYPOGRAPHY: 'TYPOGRAPHY',
  ELEVATION: 'ELEVATION',
  NUMERIC: 'NUMERIC',
  DURATION: 'DURATION',
  FONT_TYPE: 'FONT_TYPE',
  TOKEN_NAME: 'TOKEN_NAME',
  MOTION_PATH: 'MOTION_PATH',
  BEZIER: 'BEZIER',
  AXIS_VALUE: 'AXIS_VALUE',
  TEXT_TRANSFORM: 'TEXT_TRANSFORM',
} as const;
export type TokenValueType =
  (typeof TokenValueType)[keyof typeof TokenValueType];

export type TokenLinkMap = Readonly<Record<string, string>>;

export type TokenDescriptorDictionary = Readonly<{
  COLOR: TokenColor;
  LENGTH: number;
  OPACITY: number;
  SHAPE: number | Readonly<Record<string, number>>;
  LINE_HEIGHT: number | undefined;
  FONT_SIZE: number | undefined;
  FONT_WEIGHT: number;
  FONT_NAMES: readonly string[];
  TYPOGRAPHY: string;
  ELEVATION: number;
  NUMERIC: number;
  DURATION: number;
  FONT_TYPE: TokenLinkMap;
  TOKEN_NAME: string;
  MOTION_PATH: string;
  BEZIER: CubicBezier;
  AXIS_VALUE: number;
  TEXT_TRANSFORM: string;
}>;

export type TokenDescriptorBase<T extends TokenValueType> = Readonly<{
  suffix: string;
  type: T;
  value: TokenDescriptorDictionary[T];
  order: number;
  complex: boolean;
}>;

export type TokenDescriptor = {
  [K in keyof TokenDescriptorDictionary]: TokenDescriptorBase<K>;
}[keyof TokenDescriptorDictionary];

export type ProcessedToken = Readonly<Record<string, TokenDescriptor>>;
export type ProcessedTokenSet = ProcessedToken;
export type ProcessedTokenSetDescriptor = readonly [
  name: string,
  tokens: ProcessedTokenSet,
];
export type ProcessedTokenDescriptor<
  K extends TokenValueType = TokenValueType,
> = readonly [setName: string, name: string, token: TokenDescriptorBase<K>];
export const rootDir: URL = new URL('../', import.meta.url);
export const srcDir: URL = new URL('src/', rootDir);
export const tokensDir: URL = new URL('core/tokens/', srcDir);
export const tokensCacheDir: URL = new URL(
  'node_modules/.cache/tokens/parsed/',
  rootDir,
);
export const nodeModulesDir: URL = new URL('node_modules/', root);

export function findFileUrl(
  url: string,
  { containingUrl }: CanonicalizeContext,
): URL | null {
  if (url.startsWith('~')) {
    return new URL(import.meta.resolve(url.substring(1)));
  } else if (containingUrl?.pathname.includes('node_modules/')) {
    return new URL(import.meta.resolve(url, containingUrl));
  }

  return null;
}
