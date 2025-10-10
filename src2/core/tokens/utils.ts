import type { Token } from './TokenTable.ts';

export const root: URL = new URL('../../../', import.meta.url);

export type JSONModule<T> = Readonly<{
  default: T;
}>;

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

export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
    .toString(16)
    .padStart(8, '0');
  return `#${hex.endsWith('ff') ? hex.substring(0, 6) : hex}`;
}
