import { describe, expect, it } from 'vitest';
import '../../src/button/button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/switch-button.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';

/**
 * A button owns where its label breaks inside a word: a page's `overflow-wrap`
 * on a container or on the element doesn't reach the label, and one on
 * `::part(impl)` does.
 */

const TAGS = ['mx-button', 'mx-link-button', 'mx-switch-button'] as const;
const WORD = 'Download';
const CONTAINER = 60;

type Tag = (typeof TAGS)[number];
type Placement = 'container' | 'element' | 'part';

const STYLE = `.label-breaks::part(impl) { overflow-wrap: anywhere; }`;

type Reading = Readonly<{
  /** The lines of the label's text. */
  lines: number;
  /** The width of the element's box, its implementation. */
  width: number;
  /** The width of the label's text on one line. */
  textWidth: number;
}>;

async function read(tag: Tag, placement?: Placement): Promise<Reading> {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const container = document.createElement('div');
  const element = document.createElement(tag);
  element.textContent = WORD;

  if (placement) {
    container.style.width = `${CONTAINER}px`;
  }

  if (placement === 'container') {
    container.style.overflowWrap = 'anywhere';
  } else if (placement === 'element') {
    element.style.overflowWrap = 'anywhere';
  } else if (placement === 'part') {
    element.classList.add('label-breaks');
  }

  container.append(element);
  document.body.append(style, container);
  await whenFontsReady();
  await nextFrame();

  const range = document.createRange();
  range.selectNodeContents(element);
  const tops = new Set(
    [...range.getClientRects()]
      .filter(({ width }) => width > 0)
      .map(({ top }) => Math.round(top)),
  );
  const impl = element.shadowRoot!.querySelector<HTMLElement>('.host')!;
  const reading = {
    lines: tops.size,
    width: impl.getBoundingClientRect().width,
    textWidth: range.getBoundingClientRect().width,
  };
  container.remove();
  style.remove();

  return reading;
}

describe.each(TAGS)("%s label's breaks in a narrow container", (tag) => {
  it.each(['container', 'element'] as const)(
    'should keep the word on one line with overflow-wrap: anywhere on the %s',
    async (placement) => {
      const { textWidth } = await read(tag);
      const { lines, width } = await read(tag, placement);

      expect(width).toBeGreaterThan(CONTAINER);
      expect({ lines, wide: width >= textWidth }).toEqual({
        lines: 1,
        wide: true,
      });
    },
  );

  it('should break the word with overflow-wrap: anywhere on ::part(impl)', async () => {
    const { lines, width } = await read(tag, 'part');

    expect(lines).toBeGreaterThan(1);
    expect(width).toBeLessThanOrEqual(CONTAINER);
  });
});
