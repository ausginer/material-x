import { describe, expect, it } from 'vitest';
import {
  CSSVariableError,
  parseMs,
  useCSSProps,
  type CSSPropDescription,
  type CSSPropParser,
  type CSSPropsResult,
} from '../../src/controllers/useCSSProps.ts';
import type { ControlledElement } from '../../src/element.ts';
import { host } from '../browser.ts';

function setupCSSProps<
  const T extends Readonly<Record<PropertyKey, CSSPropDescription<any>>>,
>(
  vars: T,
  target?: HTMLElement,
): readonly [element: ControlledElement, props: () => CSSPropsResult<T>] {
  let props: () => CSSPropsResult<T>;
  const element = host((instance) => {
    props = useCSSProps(instance, vars, target);
  });

  return [element, props!] as const;
}

describe('useCSSProps', () => {
  it('should read parsed CSS variable values', () => {
    const [element, props] = setupCSSProps({
      color: ['--color', (value) => value],
    });

    element.style.setProperty('--color', 'tomato');
    document.body.append(element);

    expect(props()).toEqual({
      color: 'tomato',
    });
  });

  it('should trim computed CSS variable values before parsing', () => {
    const values: string[] = [];
    const [element, props] = setupCSSProps({
      gap: [
        '--gap',
        (value) => {
          values.push(value);
          return value;
        },
      ],
    });

    element.style.setProperty('--gap', '  12px  ');
    document.body.append(element);
    props();

    expect(values).toEqual(['12px']);
  });

  it('should parse values through per-property parsers', () => {
    const parseMs: CSSPropParser<number> = (value) => parseFloat(value) / 1000;
    const parseNumber: CSSPropParser<number> = (value) => parseFloat(value);
    const [element, props] = setupCSSProps({
      duration: ['--duration', parseMs],
      delay: ['--delay', parseNumber],
      size: ['--size', parseNumber],
    });

    element.style.setProperty('--duration', '150ms');
    element.style.setProperty('--delay', '.5s');
    element.style.setProperty('--size', '.5px');
    document.body.append(element);

    expect(props()).toEqual({
      duration: 0.15,
      delay: 0.5,
      size: 0.5,
    });
  });

  it('should pass the target element and CSS variable name to parser', () => {
    const target = document.createElement('span');
    const calls: unknown[] = [];
    const [element, props] = setupCSSProps(
      {
        color: [
          '--color',
          (value, parseTarget, name) => {
            calls.push(value, parseTarget, name);
            return value;
          },
        ],
      },
      target,
    );

    element.style.setProperty('--color', 'tomato');
    document.body.append(element);
    props();

    expect(calls).toEqual(['tomato', target, '--color']);
  });

  it('should preserve object keys in the returned shape', () => {
    const [element, props] = setupCSSProps({
      a: ['--first', (value) => value],
      b: ['--second', (value) => value],
    });

    element.style.setProperty('--first', 'alpha');
    element.style.setProperty('--second', 'beta');
    document.body.append(element);

    expect(Object.keys(props())).toEqual(['a', 'b']);
  });

  describe('when it reads', () => {
    function setupGap(
      value: string,
    ): readonly [
      element: ControlledElement,
      gap: () => number,
      parsed: readonly string[],
    ] {
      const parsed: string[] = [];
      const [element, props] = setupCSSProps({
        gap: [
          '--gap',
          (current, target, name) => {
            parsed.push(current);
            const result = parseFloat(current);

            if (isNaN(result)) {
              throw new CSSVariableError(name, target);
            }

            return result;
          },
        ],
      });

      element.style.setProperty('--gap', value);
      return [element, () => props().gap, parsed];
    }

    it('should not read at connect', () => {
      const [element, , parsed] = setupGap('1px');
      document.body.append(element);

      expect(parsed).toEqual([]);
    });

    it('should read at the first call in a connection', () => {
      const [element, gap] = setupGap('1px');
      document.body.append(element);
      element.style.setProperty('--gap', '2px');

      expect(gap()).toBe(2);
    });

    it('should return the same values to later calls in a connection', () => {
      const [element, props] = setupCSSProps({
        gap: ['--gap', (value) => value],
      });
      document.body.append(element);

      expect(props()).toBe(props());
    });

    it('should ignore a change of the variable after the first call in a connection', () => {
      const [element, gap] = setupGap('1px');
      document.body.append(element);
      gap();
      element.style.setProperty('--gap', '2px');

      expect(gap()).toBe(1);
    });

    it('should read again at the first call after a reconnect', () => {
      const [element, gap] = setupGap('1px');
      document.body.append(element);
      gap();
      element.remove();
      document.body.append(element);
      element.style.setProperty('--gap', '2px');

      expect(gap()).toBe(2);
    });

    it('should keep the values after a disconnect', () => {
      const [element, gap] = setupGap('1px');
      document.body.append(element);
      gap();
      element.style.setProperty('--gap', '2px');
      element.remove();

      expect(gap()).toBe(1);
    });

    it('should not throw from connectedCallback for an invalid value', () => {
      const [element] = setupGap('oops');

      expect(() => element.connectedCallback()).not.toThrow();
    });

    it('should surface CSSVariableError from the call for an invalid value', () => {
      const [element, gap] = setupGap('1px');
      document.body.append(element);
      element.style.setProperty('--gap', 'oops');

      expect(gap).toThrow(CSSVariableError);
    });

    it('should read again after a call that throws', () => {
      const [element, gap] = setupGap('oops');
      document.body.append(element);
      expect(gap).toThrow(CSSVariableError);
      element.style.setProperty('--gap', '2px');

      expect(gap()).toBe(2);
    });
  });
});

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
