import { describe, it, expect } from 'vitest';
import * as CSSVariable from '../variable.ts';

describe('CSSVariable.cssify', () => {
  it('should convert token names to CSS names', () => {
    expect(CSSVariable.cssify('container.color')).toBe('container-color');
  });
});

describe('CSSVariable.ref', () => {
  it('should build private refs by default', () => {
    expect(CSSVariable.ref('container.color')).toBe('var(--_container-color)');
  });

  it('should include fallbacks when provided', () => {
    expect(CSSVariable.ref('container.color', 'red')).toBe(
      'var(--_container-color, red)',
    );
  });

  it('should build public refs when requested', () => {
    expect(CSSVariable.ref('container.color', 'red', true)).toBe(
      'var(--container-color, red)',
    );
  });
});
