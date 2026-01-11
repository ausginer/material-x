import { describe, it, expect } from 'vitest';
import type { Token } from '../TokenTable.ts';
import {
  composeGroupSelectors,
  createAllowedTokensSelector,
  distinct,
  getSetName,
  not,
  rgbaToHex,
} from '../utils.ts';
import { cssify } from '../variable.ts';

describe('token utils', () => {
  it('should convert RGBA to hex', () => {
    expect(rgbaToHex(0, 0, 0, 255)).toBe('#000000');
    expect(rgbaToHex(255, 255, 255, 128)).toBe('#ffffff80');
  });

  it('should cssify token names', () => {
    expect(cssify('container.color')).toBe('container-color');
  });

  it('should derive set name from token suffix', () => {
    const token = {
      name: 'md.comp.button.foo',
      revisionId: '1',
      revisionCreateTime: '',
      state: 'active',
      tokenName: 'md.comp.button.foo',
      displayName: 'Foo',
      displayGroup: 'Group',
      orderInDisplayGroup: 5,
      tokenNameSuffix: 'foo',
      tokenValueType: 'number',
      createTime: '',
    } satisfies Token;

    const tokenNoSuffix = {
      ...token,
      tokenName: 'md.comp.button.bar',
    } satisfies Token;

    expect(getSetName(token)).toBe('md.comp.button');
    expect(getSetName(tokenNoSuffix)).toBe('md.comp.button.bar');
  });

  it('should return distinct values by comparator', () => {
    const result = distinct(
      Iterator.from([
        { id: 1, name: 'a' },
        { id: 1, name: 'b' },
        { id: 2, name: 'c' },
      ]),
      (item) => item.id,
    ).toArray();

    expect(result).toEqual([
      { id: 1, name: 'a' },
      { id: 2, name: 'c' },
    ]);
  });

  it('should compose group selectors', () => {
    const tokensOnly = createAllowedTokensSelector(['container.color']);
    const notHovered = not<[path: string]>(
      (path: string) => path === 'hovered',
    );
    const selector = composeGroupSelectors(tokensOnly, notHovered);

    expect(selector('default', 'container.color')).toBe(true);
    expect(selector('hovered', 'container.color')).toBe(false);
    expect(selector('default', 'container.opacity')).toBe(false);
  });
});
