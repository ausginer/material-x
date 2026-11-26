import { describe, expect, it } from 'vitest';
import { add, clamp, greet } from '../src/math.ts';

// Built by `build.ts`, so a rebuild is what a mutation of `built/` reaches.
const { value } = (await import(
  new URL('../dist/value.js', import.meta.url).href
)) as Readonly<{ value: number }>;

const engine = process.env['FIXTURE_ENGINE'] ?? 'a';

describe('add', () => {
  it('should add', () => {
    expect(add(1, 2)).toBe(3);
  });
});

describe('clamp', () => {
  it('should clamp low', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('should clamp high', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('greet', () => {
  it('should greet in the engine', () => {
    expect(greet(engine)).toBe(engine === 'a' ? 'hello, a' : 'hello');
  });
});

describe('only in a', () => {
  it.skipIf(engine !== 'a')('should add in a', () => {
    expect(add(2, 2)).toBe(4);
  });
});

describe('engine', () => {
  it('should be a', () => {
    expect(engine).toBe('a');
  });
});

describe('built', () => {
  it('should read the built value', () => {
    expect(value).toBe(2);
  });
});
