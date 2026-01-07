import { pseudoClass, type Param } from './selector.ts';
import type { Token } from './TokenTable.ts';

export const root: URL = new URL('../../', import.meta.url);

export type GroupResult = Readonly<{
  path: string;
  name: string;
}>;

export type Grouper = (tokenName: string) => GroupResult;
export type GroupSelector = (path: string, tokenName?: string) => boolean;

export type TokenValue = string | number;
export type TokenSet = Readonly<Record<string, TokenValue>>;

export type AppendInput = Readonly<
  Record<string, Readonly<Record<string, TokenValue>>>
>;

export interface ExtensionManager {
  state(path: string): Extendable;
}

export interface Extendable {
  readonly path: string;
  extends(...parents: readonly ExtensionParent[]): Extendable;
}

export type ExtensionParent = Extendable | TokenSet | undefined;

export type ParentRef =
  | Readonly<{ kind: 'local'; key: string }>
  | Readonly<{ kind: 'external'; tokens: TokenSet }>;

export type ExtensionEntry = Readonly<{
  path: string;
  parents: readonly ParentRef[];
}>;

/** Default grouping: places all tokens in the "default" bucket. */
export const defaultGrouper: Grouper = (tokenName) => ({
  path: 'default',
  name: tokenName,
});

export const componentStateMap: Readonly<Record<string, Param>> = {
  hovered: pseudoClass('hover'),
  focused: pseudoClass('focus-visible'),
  pressed: pseudoClass('active'),
  disabled: pseudoClass('disabled'),
};

/** Converts RGBA byte values to hex, trimming the alpha channel when opaque. */
export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
    .toString(16)
    .padStart(8, '0');
  return `#${hex.endsWith('ff') ? hex.substring(0, 6) : hex}`;
}

export function composeGroupSelectors(
  ...callbacks: readonly GroupSelector[]
): GroupSelector {
  return (path, tokenName) =>
    callbacks.every((callback) => callback(path, tokenName));
}

export type JSONModule<T> = Readonly<{
  default: T;
}>;

export function getSetName(token: Token): string {
  const suffix = `.${token.tokenNameSuffix}`;
  return token.tokenName.endsWith(suffix)
    ? token.tokenName.slice(0, -suffix.length)
    : token.tokenName;
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

export type Predicate<T extends readonly any[]> = (...args: T) => boolean;

export function not<T extends readonly any[]>(
  predicate: Predicate<T>,
): Predicate<T> {
  return (...args) => !predicate(...args);
}
