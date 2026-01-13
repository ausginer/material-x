import { describe, it, expect } from 'vitest';
import processTokenSet from '../processTokenSet.ts';
import type { Token } from '../TokenTable.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  mockDB,
  state,
} from './helpers.ts';

describe('processTokenSet', () => {
  it('should throw when token set is missing', () => {
    state.tokenSets = [];

    expect(() => processTokenSet('missing')).toThrow(
      'Token set not found: missing',
    );
  });

  it('should process tokens and filter nulls', () => {
    const tokenSet = createTokenSet();
    const tokens: [Token, Token] = [
      createToken({
        tokenNameSuffix: 'container.color',
        name: 'md.comp.test.container.color',
        tokenName: 'md.comp.test.container.color',
      }),
      createToken({
        tokenNameSuffix: 'container.opacity',
        name: 'md.comp.test.container.opacity',
        tokenName: 'md.comp.test.container.opacity',
      }),
    ];

    state.tokenSets = [tokenSet];
    state.tokens = tokens;
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.comp.test' });

    const values = new Map<string, { value: ReturnType<typeof createValue> }>();
    const [colorToken] = tokens;
    values.set(colorToken.name, {
      value: createValue({ name: colorToken.name, numeric: 1 }),
    });

    mockDB.getValue.mockImplementation((token: Token) =>
      values.get(token.name),
    );

    expect(processTokenSet('md.comp.test')).toEqual({
      'container.color': '1',
    });
    console.log(
      'Expected error above: missing value for md.comp.test.container.opacity',
    );
  });
});
