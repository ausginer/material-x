import { CSSVariableError } from '@ydinjs/core/controllers/useCSSProps.js';
import { describe, expect, it } from 'vitest';
import { parseMs } from '../../../src/core/utils/fns.ts';

describe('parseMs', () => {
  const target = document.createElement('div');

  it.each([
    ['0.25s', 250],
    ['250ms', 250],
    ['0s', 0],
    ['0ms', 0],
    ['1.5s', 1500],
    ['99ms', 99],
    ['250MS', 250],
    ['250Ms', 250],
    ['0.25S', 250],
  ] as const)('should read %s as %d ms', (value, ms) => {
    expect(parseMs(value, target, '--_duration')).toBe(ms);
  });

  it.each(['', 'auto', 'ms', 'MS'])(
    'should throw a CSSVariableError on %j, which has no number',
    (value) => {
      expect(() => parseMs(value, target, '--_duration')).toThrow(
        CSSVariableError,
      );
    },
  );
});
