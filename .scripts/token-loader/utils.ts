import type { SassDeclarationSingle } from './TokenSystemProcessor.js';

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
@use '../defaults/refs' as refs;
@use '../defaults/sys' as sys;

`;

export function tokenNameToSassVar(
  tokenName: string,
  currentSet: string,
): string {
  if (tokenName.startsWith(currentSet)) {
    return `$${tokenName.substring(currentSet.length + 1).replaceAll('.', '-')}`;
  }

  const bareTokenName = tokenName.replaceAll('.', '-');

  if (bareTokenName.startsWith('md-sys')) {
    return `sys.$${bareTokenName.replace('md-sys-', '')}`;
  } else if (bareTokenName.startsWith('md-ref')) {
    return `refs.$${bareTokenName.replace('md-ref-', '')}`;
  }

  return `$${bareTokenName}`;
}

export function tokenNameToCssVar(tokenName: string): string {
  return `--${tokenName.replaceAll('.', '-')}`;
}

export function tokenNameToSassVarDeclaration(
  tokenName: string,
  setName: string,
): string {
  return `$${tokenName.replace(`${setName}.`, '').replaceAll('.', '-')}`;
}

export function tokenValueToCSSVarWithFallback(
  tokenSetName: string,
  declaration: SassDeclarationSingle,
): SassDeclarationSingle {
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
