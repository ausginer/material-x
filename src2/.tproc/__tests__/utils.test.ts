import { describe, it, expect } from 'vitest';
import type { Token } from '../TokenTable.ts';
import {
  buildSelector,
  cssify,
  distinct,
  getSetName,
  rgbaToHex,
} from '../utils.ts';

describe('buildSelector', () => {
  it('should build scoped selector', () => {
    expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
      ':host([color="elevated"])',
    );
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
});
