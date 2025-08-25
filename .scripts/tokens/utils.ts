import type { Token } from './TokenTable.ts';

export const COLLATOR: Intl.Collator = Intl.Collator('en');

export const HEADER = `/// Tokens for the button component, according to the Material Design
/// specification: https://m3.material.io
///
/// !!! THIS FILE WAS AUTOMATICALLY GENERATED !!!
/// !!! DO NOT MODIFY IT BY HAND !!!
@use "sass:map";
`;

export function getSetName(token: Token): string {
  return token.tokenName.replace(`.${token.tokenNameSuffix}`, '');
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

export function camelCaseToKebabCase(str: string): string {
  return str.replace(/[A-Z]/gu, (x) => `-${x.toLowerCase()}`);
}

export function sassName(token: string): string {
  return token.replaceAll('.', '-');
}

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
    .toString(16)
    .padStart(8, '0');
  return `#${hex.endsWith('ff') ? hex.substring(0, 6) : hex}`;
}

export type SetSpec = Readonly<{
  fileName: string;
  order: number;
}>;

export type SetSpecMap = Readonly<Record<string, SetSpec>>;

export type GroupingRule = Readonly<{
  regexp?: string;
  order?: number;
  children: GroupingRuleMap;
}>;

export type GroupingRuleMap = Readonly<Record<string, GroupingRule>>;

export type ComponentSpec = Readonly<{
  sets: SetSpecMap;
  groups: GroupingRuleMap;
}>;
