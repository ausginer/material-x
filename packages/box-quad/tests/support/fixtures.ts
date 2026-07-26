import { expect } from 'vitest';

export const QUAD_TOLERANCE = 0.000001;

export type BoxOptions = Readonly<{
  parent?: HTMLElement;
  tag?: keyof HTMLElementTagNameMap;
  styles?: Readonly<Partial<CSSStyleDeclaration>>;
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
): void {
  expect(actual).toHaveLength(8);
  expect(expected).toHaveLength(8);

  for (let index = 0; index < 8; index += 1) {
    expect(Math.abs(actual[index]! - expected[index]!)).toBeLessThanOrEqual(
      QUAD_TOLERANCE,
    );
  }
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
