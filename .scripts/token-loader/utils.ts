import type { SassDeclarationSingle } from './TokenSystemProcessor.js';

export const root: URL = new URL('../../', import.meta.url);

export type SassDeclaration = Readonly<Record<string, string | number>>;

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export const COLLATOR: Intl.Collator = Intl.Collator('en');

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
