import { describe, expect, it } from 'vitest';
import { canCopy } from '../src/composition/copy.ts';

describe('canCopy', () => {
  it('should copy between modules of one extension', () => {
    expect(canCopy('m(a, b, c) { return a < b > (c); }', 'a.js', 'b.js')).toBe(
      true,
    );
  });

  it('should copy JavaScript that parses to the same tree in TypeScript', () => {
    expect(
      canCopy('focus(options) { record(this, options); }', 'a.js', 'b.ts'),
    ).toBe(true);
  });

  it('should refuse JavaScript that TypeScript reads as a type argument', () => {
    expect(canCopy('m(a, b, c) { return a < b > (c); }', 'a.js', 'b.ts')).toBe(
      false,
    );
  });

  it('should refuse TypeScript syntax into JavaScript', () => {
    expect(canCopy('m(a: number) { return a; }', 'a.ts', 'b.js')).toBe(false);
  });

  it('should refuse an angle-bracket assertion into .mts', () => {
    expect(canCopy('m(a) { return <number>a; }', 'a.ts', 'b.mts')).toBe(false);
  });
});
