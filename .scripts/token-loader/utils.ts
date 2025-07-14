import type { SassDeclarationToken } from './TokenSystemProcessor.ts';

export const root: URL = new URL('../../', import.meta.url);

export type SassDeclaration = Readonly<Record<string, string | number>>;

export type SassDeclarationSet = Readonly<{
  declarations: SassDeclaration;
  setName: string;
}>;

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export const COLLATOR: Intl.Collator = Intl.Collator('en');

export const HEADER = `/*
 * Tokens for the button component, according to the Material Design
 * specification: https://m3.material.io
 *
 * !!! THIS FILE WAS AUTOMATICALLY GENERATED !!!
 * !!! DO NOT MODIFY IT BY HAND !!!
 */
@use "sass:map";
`;

export function extractSetName(
  tokenName: string,
  tokenNameSuffix: string,
): string {
  return tokenName.replace(`.${tokenNameSuffix}`, '');
}

export function tokenNameToSass(token: string): string {
  return token.replaceAll('.', '-');
}

export function tokenNameToCssVar(tokenName: string): string {
  return `--${tokenNameToSass(tokenName)}`;
}

export function tokenValueToCSSVarWithFallback(
  tokenSetName: string,
  declaration: SassDeclarationToken,
): SassDeclarationToken {
  const [name, value] = declaration;

  if (value == null) {
    return declaration;
  }

  return [
    name,
    `var(${tokenNameToCssVar(`${tokenSetName}.${name.substring(1)}`)}, ${value})`,
  ];
}

export function* distinct<T>(
  iterator: IteratorObject<T>,
  comparator: (element: T) => unknown = (element) => element,
): IteratorObject<T> {
  const set = new Set();

  for (const element of iterator) {
    const compared = comparator(element);

    if (!set.has(compared)) {
      set.add(compared);
      yield element;
    }
  }

  return undefined;
}

export function kebabCaseToCamelCase(str: string): string {
  return str.replace(/-./g, (x) => x[1].toUpperCase());
}
