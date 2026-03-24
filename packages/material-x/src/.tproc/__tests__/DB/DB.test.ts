import { describe, it, expect } from 'vitest';
import { DB } from '../../DB/DB.ts';
import type { ReferenceTree, ResolvedValue } from '../../TokenTable.ts';
import {
  createSystem,
  createTag,
  createTheme,
  createToken,
  createTokenSet,
  createValue,
} from '../helpers.ts';

describe('DB', () => {
  it('should expose tokens and token sets', () => {
    const tokenSet = createTokenSet();
    const token = createToken();
    const value = createValue();
    const db = new DB(
      createTheme(),
      [
        createSystem({
          tokenSets: [tokenSet],
          tokens: [token],
          values: [value],
        }),
      ],
      ['expressive'],
    );

    expect(db.getToken(token.tokenName)).toEqual(token);
    expect(db.tokens.toArray()).toEqual([token]);
    expect(db.tokenSets.toArray()).toEqual([tokenSet]);
  });

  it('should resolve sets for known and orphan tokens', () => {
    const tokenSet = createTokenSet();
    const token = createToken({
      name: 'md.comp.test.token',
      tokenName: 'md.comp.test.token',
      tokenNameSuffix: 'token',
    });
    const orphan = createToken({
      name: 'md.other.token',
      tokenName: 'md.other.token',
      tokenNameSuffix: 'token',
    });
    const db = new DB(
      createTheme(),
      [createSystem({ tokenSets: [tokenSet], tokens: [token, orphan] })],
      [],
    );

    expect(db.getSet(token)).toEqual(tokenSet);
    expect(db.getSet(orphan)).toEqual({ tokenSetName: 'md.other' });
  });

  it('should detect deprecated tokens', () => {
    const deprecatedSet = createTokenSet({
      displayName: '[Deprecated] Test',
      name: 'md.comp.deprecated',
      tokenSetName: 'md.comp.deprecated',
    });
    const deprecatedToken = createToken({
      name: 'md.comp.deprecated.token',
      tokenName: 'md.comp.deprecated.token',
      tokenNameSuffix: 'token',
    });
    const explicitToken = createToken({
      name: 'md.comp.explicit.token',
      tokenName: 'md.comp.explicit.token',
      tokenNameSuffix: 'token',
      deprecationMessage: { message: 'Deprecated' },
    });
    const db = new DB(
      createTheme(),
      [
        createSystem({
          tokenSets: [deprecatedSet],
          tokens: [deprecatedToken, explicitToken],
        }),
      ],
      [],
    );

    expect(db.isTokenDeprecated(deprecatedToken)).toBe(true);
    expect(db.isTokenDeprecated(explicitToken)).toBe(true);
  });

  it('should return tokens for a set', () => {
    const tokenSet = createTokenSet({ name: 'md.comp.test' });
    const token = createToken({
      name: 'md.comp.test.token',
      tokenName: 'md.comp.test.token',
    });
    const otherToken = createToken({
      name: 'md.other.token',
      tokenName: 'md.other.token',
    });
    const db = new DB(
      createTheme(),
      [createSystem({ tokenSets: [tokenSet], tokens: [token, otherToken] })],
      [],
    );

    expect(db.getSetTokens(tokenSet)).toEqual([token]);
  });

  it('should resolve reference trees using allowed tags', () => {
    const token = createToken({
      name: 'md.comp.test.token',
      tokenName: 'md.comp.test.token',
    });
    const value = createValue({ name: 'md.comp.test.value' });
    const referenceTree: ReferenceTree = {
      value: {
        name: 'md.comp.test.value',
        version: '1',
        revisionId: '1',
      },
      childNodes: [],
    };
    const resolvedValue: ResolvedValue = { numeric: 12 };

    const db = new DB(
      createTheme(),
      [
        createSystem({
          tokens: [token],
          values: [value],
          tags: [createTag({ name: 'expressive-tag', tagName: 'expressive' })],
          contextualReferenceTrees: {
            [token.name]: {
              contextualReferenceTree: [
                {
                  contextTags: ['expressive-tag'],
                  referenceTree,
                  resolvedValue,
                },
              ],
            },
          },
        }),
      ],
      ['expressive'],
    );

    expect(
      db.getReferenceTreeAndResolvedValue(token.name, ['expressive-tag']),
    ).toEqual([referenceTree, resolvedValue]);
    expect(db.getValue(token)).toEqual({ value, resolvedValue });
  });

  it('should resolve values by prefix and cache results', () => {
    const token = createToken({
      name: 'md.comp.test.token',
      tokenName: 'md.comp.test.token',
    });
    const value = createValue({ name: 'md.comp.test.token' });
    const db = new DB(
      createTheme(),
      [
        createSystem({
          tokens: [token],
          values: [value],
        }),
      ],
      [],
    );

    const first = db.getValue(token);
    const second = db.getValue(token);

    expect(first).toEqual({ value, resolvedValue: undefined });
    expect(second).toBe(first);
  });

  it('should return undefined when reference tree is missing', () => {
    const db = new DB(createTheme(), [createSystem()], []);

    expect(db.getReferenceTreeAndResolvedValue('missing', [])).toBeUndefined();
  });
});
