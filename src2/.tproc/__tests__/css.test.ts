import { describe, it, expect } from 'vitest';
import { css } from '../css.ts';

describe('css', () => {
  it('should interpolate primitive values', () => {
    expect(css`a ${1} ${'b'}`).toBe('a 1 b');
  });

  it('should flatten array values', () => {
    expect(css`a ${['b', 'c', [1, 2]]} d`).toBe('a bc12 d');
  });

  it('should ignore nullish values', () => {
    expect(css`a ${null} ${undefined} b`).toBe('a   b');
  });

  it('should throw on object values', () => {
    expect(() => css`a ${{}} b`).toThrow('Object values are not allowed');
  });
});
