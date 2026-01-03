import type { Param } from './selector.ts';
import { attribute, pseudoClass, selector } from './selector.ts';
import type { Token } from './TokenTable.ts';

export const root: URL = new URL('../../', import.meta.url);

export type VariantScope = Readonly<{
  name: string;
  value: string;
}>;

export type GroupResult = Readonly<{
  path: string;
  name: string;
}>;

export type Grouper = (tokenName: string) => GroupResult;

export type TokenValue = string | number;
export type TokenSet = Readonly<Record<string, TokenValue>>;

export type AppendInput = Readonly<
  Record<string, Readonly<Record<string, TokenValue>>>
>;

export type Extendable = Readonly<{
  path: string;
  extends(...parents: readonly ExtensionParent[]): void;
}>;

export type ExtensionParent = Extendable | TokenSet | undefined;

export type ExtensionManager = Readonly<{
  state(path: string): Extendable;
}>;

export type ParentRef =
  | Readonly<{ kind: 'local'; key: string }>
  | Readonly<{ kind: 'external'; tokens: TokenSet }>;

export type ExtensionEntry = Readonly<{
  path: string;
  parents: readonly ParentRef[];
}>;

/** Default grouping: places all tokens in the "default" bucket. */
export const defaultGroup: Grouper = (tokenName) => ({
  path: 'default',
  name: tokenName,
});

const stateMap: Readonly<Record<string, string>> = {
  hovered: 'hover',
  focused: 'focus-visible',
  pressed: 'active',
  disabled: 'disabled',
};

/** Converts RGBA byte values to hex, trimming the alpha channel when opaque. */
export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
    .toString(16)
    .padStart(8, '0');
  return `#${hex.endsWith('ff') ? hex.substring(0, 6) : hex}`;
}

/** Converts token names to CSS custom property names. */
export function cssify(name: string): string {
  return name.replaceAll('.', '-');
}

/** Builds a :host selector for a dot-separated state path and optional scope. */
export function buildSelector(path: string, scope?: VariantScope): string {
  const params: Param[] = [];

  if (scope) {
    params.push(attribute(scope.name, scope.value));
  }

  const segments = path.length > 0 ? path.split('.') : [];

  for (const segment of segments) {
    if (!segment || segment === 'default') {
      continue;
    }

    const mapped = stateMap[segment];
    params.push(mapped ? pseudoClass(mapped) : pseudoClass('state', segment));
  }

  return selector(':host', ...params);
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

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('buildSelector', () => {
    it('should build scoped selector', () => {
      expect(
        buildSelector('default', { name: 'color', value: 'elevated' }),
      ).toBe(':host([color="elevated"])');
    });

    it('should build built-in state selector', () => {
      expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');
    });

    it('should build custom state selector', () => {
      expect(buildSelector('selected', undefined)).toBe(
        ':host(:state(selected))',
      );
    });
  });
}
