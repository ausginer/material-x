import { beforeEach, describe, expect, it, vi } from 'vitest';
import processToken, { toCSSValue } from '../src/processToken.ts';
import type { ProcessedTokenValue } from '../src/processTokenSet.ts';
import { isLinkedToken, resolve } from '../src/resolve.ts';
import store from '../src/store/index.ts';
import type { StoredToken, StoredValue } from '../src/store/schema.ts';
import { MATERIAL_WEB_COLORS } from './fixtures/material-web-colors.ts';
import { MATERIAL_WEB_TYPESCALE } from './fixtures/material-web-typescale.ts';

// These rows read the committed store, which the setup file replaces.
vi.unmock('../src/store/index.ts');

const REM = 16;

/** The CSS layer's value of a token, as the fixture writes it. */
function published(tokenName: string): string | number {
  const resolved = resolve(tokenName, processToken(store.getToken(tokenName)!));

  if (typeof resolved !== 'string') {
    throw new Error(`Expected a CSS value for ${tokenName}`);
  }

  const value = resolved.replace(
    /^var\([^,]+, (?<fallback>.*)\)$/u,
    '$<fallback>',
  );

  if (value.endsWith('px')) {
    return Number.parseFloat(value) / REM;
  }

  return value.startsWith('"') ? value.slice(1, -1) : Number(value);
}

/** The literal that the CSS layer reaches from a token, hop by hop. */
function reach(token: StoredToken): ProcessedTokenValue | null {
  // The CSS layer takes the system colours from the theme, not from the store.
  const value =
    store.getTokenSet(token).tokenSetName === 'md.sys.color'
      ? toCSSValue(store.select(token)!.value)
      : processToken(token);

  return isLinkedToken(value) ? reach(store.getToken(value)!) : value;
}

describe('rendered context', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it.each(
    Object.entries(MATERIAL_WEB_TYPESCALE).flatMap(([style, properties]) =>
      Object.entries(properties).map(
        ([property, value]) => [`${style}.${property}`, value] as const,
      ),
    ),
  )('should give %s the value that material-web publishes', (name, value) => {
    const actual = published(`md.sys.typescale.${name}`);

    if (typeof value === 'number') {
      expect(actual).toBeCloseTo(value, 6);
    } else {
      expect(actual).toBe(value);
    }
  });

  // The CSS layer takes the system colours from the theme, so these rows read
  // the store.
  it.each(Object.entries(MATERIAL_WEB_COLORS))(
    'should select the reference that material-web publishes for %s',
    (tokenName, reference) => {
      expect(store.select(store.getToken(tokenName)!)?.value.tokenName).toBe(
        reference,
      );
    },
  );

  it.each(
    Object.entries(MATERIAL_WEB_TYPESCALE).filter(
      ([style]) => !style.startsWith('emphasized.'),
    ),
  )(
    'should give md.ref.typeface.%s.line-height the line height that material-web publishes for the base style',
    (style, { 'line-height': lineHeight }) => {
      expect(published(`md.ref.typeface.${style}.line-height`)).toBeCloseTo(
        lineHeight,
        6,
      );
    },
  );

  it("should reach each literal token's own resolved value", () => {
    const different: string[] = [];
    let compared = 0;

    for (const token of store.tokens) {
      const resolved = store.select(token)?.entry?.resolvedValue;

      // A composite is compared through the tokens of its parts.
      if (!resolved || resolved.type) {
        continue;
      }

      compared += 1;

      const expected = toCSSValue(
        // Only a resolved `type` differs from a stored value.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        resolved as StoredValue,
      );

      if (JSON.stringify(reach(token)) !== JSON.stringify(expected)) {
        different.push(token.tokenName);
      }
    }

    // A store that reads no token would compare nothing and pass.
    expect(compared).toBeGreaterThan(0);
    expect(different).toEqual([]);
  });
});
