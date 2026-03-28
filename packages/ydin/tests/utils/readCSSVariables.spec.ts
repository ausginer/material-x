import { describe, expect, it } from 'vitest';
import CSSVariableError from '../../src/utils/CSSVariableError.ts';
import {
  readCSSVariables,
  transformNumericVariable,
} from '../../src/utils/readCSSVariables.ts';

function createHost(): HTMLDivElement {
  const host = document.createElement('div');

  document.body.append(host);

  return host;
}

describe('transformNumericVariable', () => {
  it('should parse plain numeric values', () => {
    const host = createHost();

    expect(transformNumericVariable('size', '12', host)).toBe(12);
    expect(transformNumericVariable('size', '+12', host)).toBe(12);
  });

  it('should parse decimal values including leading-dot forms', () => {
    const host = createHost();

    expect(transformNumericVariable('opacity', '.5', host)).toBe(0.5);
    expect(transformNumericVariable('opacity', '-.5', host)).toBe(-0.5);
    expect(transformNumericVariable('opacity', '+.5', host)).toBe(0.5);
  });

  it('should parse px values as numbers', () => {
    const host = createHost();

    expect(transformNumericVariable('size', '12px', host)).toBe(12);
    expect(transformNumericVariable('size', '.5px', host)).toBe(0.5);
  });

  it('should convert ms values to seconds', () => {
    const host = createHost();

    expect(transformNumericVariable('duration', '150ms', host)).toBe(0.15);
    expect(transformNumericVariable('duration', '.5ms', host)).toBe(0.0005);
  });

  it('should reject invalid numeric values', () => {
    const host = createHost();

    expect(() => transformNumericVariable('size', '12abc', host)).toThrow(
      CSSVariableError,
    );
  });
});

describe('readCSSVariables', () => {
  it('should read raw CSS variable values by default', () => {
    const host = createHost();

    host.style.setProperty('--color', 'tomato');

    expect(readCSSVariables(host, { color: '--color' })).toEqual({
      color: 'tomato',
    });
  });

  it('should trim computed CSS variable values before transforming', () => {
    const host = createHost();
    const values: string[] = [];

    host.style.setProperty('--gap', '  12px  ');

    readCSSVariables(host, { gap: '--gap' }, (_, value) => {
      values.push(value);
      return value;
    });

    expect(values).toEqual(['12px']);
  });

  it('should transform values through a custom transform callback', () => {
    const host = createHost();

    host.style.setProperty('--duration', '150ms');
    host.style.setProperty('--size', '.5px');

    const values = readCSSVariables(
      host,
      {
        duration: '--duration',
        size: '--size',
      },
      transformNumericVariable,
    );

    expect(values).toEqual({
      duration: 0.15,
      size: 0.5,
    });
  });

  it('should preserve object keys in the returned shape', () => {
    const host = createHost();

    host.style.setProperty('--first', 'alpha');
    host.style.setProperty('--second', 'beta');

    expect(
      Object.keys(readCSSVariables(host, { a: '--first', b: '--second' })),
    ).toEqual(['a', 'b']);
  });

  it('should surface CSSVariableError for invalid transformed values', () => {
    const host = createHost();

    host.style.setProperty('--duration', 'oops');

    expect(() =>
      readCSSVariables(
        host,
        { duration: '--duration' },
        transformNumericVariable,
      ),
    ).toThrow(CSSVariableError);
  });
});
