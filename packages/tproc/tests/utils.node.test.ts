import { describe, it, expect } from 'vitest';
import {
  composeGroupSelectors,
  createAllowedTokensSelector,
  rgbaToHex,
} from '../src/utils.ts';
import { cssify } from '../src/variable.ts';

describe('token utils', () => {
  it('should convert RGBA to hex', () => {
    expect(rgbaToHex(0, 0, 0, 255)).toBe('#000000');
    expect(rgbaToHex(255, 255, 255, 128)).toBe('#ffffff80');
  });

  it('should cssify token names', () => {
    expect(cssify('container.color')).toBe('container-color');
  });

  it('should compose group selectors', () => {
    const tokensOnly = createAllowedTokensSelector(['container.color']);
    const notHovered = (path: string) => path !== 'hovered';
    const selector = composeGroupSelectors(tokensOnly, notHovered);

    expect(selector('default', 'container.color')).toBeTruthy();
    expect(selector('hovered', 'container.color')).toBeFalsy();
    expect(selector('default', 'container.opacity')).toBeFalsy();
  });
});
