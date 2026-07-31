import { expect } from 'vitest';
import {
  box,
  coordinates,
  projection,
  quad,
  type Box,
  type BoxCache,
  type Quad,
} from '../../src/index.ts';

export const QUAD_TOLERANCE = 0.000001;

export type Styles = Readonly<{
  [K in keyof CSSStyleDeclaration as K extends string
    ? CSSStyleDeclaration[K] extends string
      ? K
      : never
    : never]?: string;
}>;

export type BoxOptions = Readonly<{
  parent?: HTMLElement;
  tag?: keyof HTMLElementTagNameMap;
  styles?: Readonly<Partial<Styles>>;
}>;

export function createBox(options: BoxOptions = {}): HTMLElement {
  const element = document.createElement(options.tag ?? 'div');
  const parent = options.parent ?? document.body;

  Object.assign(
    element.style,
    {
      boxSizing: 'border-box',
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '20px',
      height: '10px',
      transformOrigin: '0 0',
    },
    options.styles,
  );
  parent.append(element);
  return element;
}

export function createFlowBox(options: BoxOptions = {}): HTMLElement {
  const element = document.createElement(options.tag ?? 'div');
  const parent = options.parent ?? document.body;

  Object.assign(
    element.style,
    {
      boxSizing: 'border-box',
      width: '20px',
      height: '10px',
    },
    options.styles,
  );
  parent.append(element);
  return element;
}

export function resetDocument(): void {
  window.scrollTo(0, 0);
  document.documentElement.removeAttribute('style');
  document.body.replaceChildren();
  Object.assign(document.body.style, {
    margin: '0px',
    minHeight: '0px',
  });
}

export async function settleLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function sentinels(): Float64Array {
  return new Float64Array([11, 22, 33, 44, 55, 66, 77, 88]);
}

export function expectQuad(
  actual: Float64Array,
  expected: ArrayLike<number>,
  tolerance: number = QUAD_TOLERANCE,
): void {
  expect(actual).toHaveLength(8);
  expect(expected).toHaveLength(8);

  for (let index = 0; index < 8; index += 1) {
    expect(Math.abs(actual[index]! - expected[index]!)).toBeLessThanOrEqual(
      tolerance,
    );
  }
}

/**
 * The composed measure-then-project read, as a single boolean.
 *
 * The package deliberately no longer offers this in one call — measurement and
 * projection are separate concerns — but most behavioural assertions here are
 * about the end-to-end result, so the composition lives in the fixtures.
 * Returns `false` if either step fails, leaving `out` untouched.
 */
export function readQuad(
  element: HTMLElement,
  out: Quad,
  relativeTo?: HTMLElement,
  recache?: BoxCache,
): boolean {
  const source = box();

  if (!coordinates(element, source, recache)) {
    return false;
  }

  if (!relativeTo) {
    return projection(source, out);
  }

  const target = box();

  return (
    coordinates(relativeTo, target, recache) && projection(source, out, target)
  );
}

/** Measures `element`, asserting the measurement succeeded. */
export function measure(element: HTMLElement, recache?: BoxCache): Box {
  const out = box();

  expect(coordinates(element, out, recache)).toBe(true);
  return out;
}

/**
 * The two-step read: measure, then project. Asserts both steps succeeded, and
 * measures `relativeTo` in the same epoch when one is given.
 */
export function readSuccessfulQuad(
  element: HTMLElement,
  relativeTo?: HTMLElement,
  recache?: BoxCache,
): Quad {
  const out = quad();
  const source = measure(element, recache);
  const target = relativeTo ? measure(relativeTo, recache) : undefined;

  expect(projection(source, out, target)).toBe(true);
  return out;
}

export function createFrame(): Document {
  const frame = document.createElement('iframe');
  frame.style.border = '0';
  document.body.append(frame);

  const frameDocument = frame.contentDocument;

  if (!frameDocument) {
    throw new Error('iframe has no contentDocument');
  }

  frameDocument.body.style.margin = '0px';
  return frameDocument;
}

export function createShadowBox(
  mode: ShadowRootMode,
): Readonly<{ host: HTMLElement; source: HTMLElement }> {
  const host = createBox({
    styles: {
      width: '200px',
      height: '150px',
      transform: 'translate(10px, 5px)',
    },
  });
  const root = host.attachShadow({ mode });
  const source = document.createElement('div');

  Object.assign(source.style, {
    boxSizing: 'border-box',
    position: 'absolute',
    left: '20px',
    top: '30px',
    width: '20px',
    height: '10px',
  });
  root.append(source);
  return { host, source };
}
