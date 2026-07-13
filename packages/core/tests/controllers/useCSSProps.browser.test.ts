import { describe, expect, it } from 'vitest';
import {
  CSSVariableError,
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

  it('should surface CSSVariableError for invalid parsed values', () => {
    const [element] = setupCSSProps({
      duration: [
        '--duration',
        (value, target, name) => {
          const result = parseFloat(value);

          if (isNaN(result)) {
            throw new CSSVariableError(name, target);
          }

          return result;
        },
      ],
    });

    element.style.setProperty('--duration', 'oops');

    expect(() => element.connectedCallback()).toThrow(CSSVariableError);
  });
});
