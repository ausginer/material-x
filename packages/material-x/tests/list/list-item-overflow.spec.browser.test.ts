import { describe, expect, it } from 'vitest';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/checkbox/checkbox.ts';
import '../../src/icon/icon.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { nextFrame } from '../browser.ts';

const ITEMS = [
  'mx-list-item',
  'mx-list-button-item',
  'mx-list-link-item',
] as const;

const SETTINGS = ITEMS.flatMap((tag) =>
  (['ltr', 'rtl'] as const).map((direction) => ({ tag, direction })),
);

/** The part of the item that a label keeps. The component's own choice. */
const LABEL_PART = 0.15;

/** A geometry tolerance for subpixel layout. */
const SUBPIXEL = 0.5;

const WORD = 'x'.repeat(60);
const WORDS = 'A label of several words '.repeat(3);
const LONG = 'A trailing text that is much longer than the item it is in';

function trail(text: string): string {
  return `<span slot="trail">${text}</span>`;
}

const ICON = '<mx-icon slot="trail">check</mx-icon>';
const ICON_BUTTON =
  '<mx-icon-button slot="trail"><mx-icon>check</mx-icon></mx-icon-button>';
const CHECKBOX = '<mx-checkbox slot="trail"></mx-checkbox>';
const BUTTON = '<mx-button slot="trail">Two bits</mx-button>';
const WIDER_BUTTON = '<mx-button slot="trail">A button, 130</mx-button>';
const WIDE_BUTTON =
  '<mx-button slot="trail">A button with a label that is very wide</mx-button>';
const FIXED =
  '<span slot="trail" style="display: block; inline-size: 120px; block-size: 24px"></span>';
const VIDEO = '<video slot="lead"></video>';
const LARGE_VIDEO = `${VIDEO}<span slot="overline">Over</span><span slot="support">Support</span>`;
const IMAGE =
  '<img slot="lead" style="inline-size: 180px; block-size: 56px" alt="">';

const CONTENTS: ReadonlyArray<readonly [string, string]> = [
  ['a short text', `Label${trail('12:30')}`],
  ['a long text', `Label${trail(LONG)}`],
  ['a medium text', `Label${trail('Yesterday, 12:30, from the office')}`],
  ['a long label and a short text', `${WORDS}${trail('12:30')}`],
  ['a long label and a long text', `${WORDS}${trail(LONG)}`],
  ['a long word in trail', `Label${trail(WORD)}`],
  ['a long word in the label', `${WORD}${trail('12:30')}`],
  [
    'a long word in overline',
    `Label<span slot="overline">${WORD}</span>${trail('12:30')}`,
  ],
  [
    'a long word in support',
    `Label<span slot="support">${WORD}</span>${trail('12:30')}`,
  ],
  ['two texts', `Label${trail('12:30')}${trail('new')}`],
  ['two icons', `Label${ICON}${ICON}`],
  ['two icon buttons', `Label${ICON_BUTTON}${ICON_BUTTON}`],
  ['a text and an icon', `Label${trail('12:30')}${ICON}`],
  ['a checkbox', `Label${CHECKBOX}`],
  ['a button', `Label${BUTTON}`],
  ['a wide button', `Label${WIDE_BUTTON}`],
  ['a video and a long text', `${VIDEO}Label${trail(LONG)}`],
  ['a video and a button', `${VIDEO}Label${BUTTON}`],
  ['a video and a wider button', `${VIDEO}Label${WIDER_BUTTON}`],
  ['a video and a fixed child', `${VIDEO}Label${FIXED}`],
  ['a video and a short text', `${VIDEO}Label${trail('12:30')}`],
  ['a large video and a long text', `${LARGE_VIDEO}Label${trail(LONG)}`],
  ['a large video and a button', `${LARGE_VIDEO}Label${BUTTON}`],
  ['a large video and a wider button', `${LARGE_VIDEO}Label${WIDER_BUTTON}`],
  ['a large video and a fixed child', `${LARGE_VIDEO}Label${FIXED}`],
];

type Item = Readonly<{
  frame: HTMLElement;
  element: HTMLElement;
  /** The box that the item draws. */
  box: HTMLElement;
}>;

async function createItem(
  tag: (typeof ITEMS)[number],
  direction: 'ltr' | 'rtl',
  html: string,
  width = 300,
): Promise<Item> {
  const frame = document.createElement('div');
  frame.dir = direction;
  frame.style.cssText = `inline-size: ${width}px; overflow: auto;`;
  frame.innerHTML = `<mx-list><${tag}>${html}</${tag}></mx-list>`;
  document.body.append(frame);
  await nextFrame();
  const element = frame.querySelector<HTMLElement>(tag)!;

  return {
    frame,
    element,
    box: element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element,
  };
}

function inner(element: Element): Element {
  return element.shadowRoot?.querySelector('.host') ?? element;
}

function childrenOf({ element }: Item, slot: string): readonly Element[] {
  return [...element.querySelectorAll(`[slot="${slot}"]`)].map(inner);
}

function partOf({ element }: Item, name: string): DOMRect {
  return element.shadowRoot!.querySelector(`.${name}`)!.getBoundingClientRect();
}

/** The inline size of the box that the item's children are laid out in. */
function contentSize({ box }: Item): number {
  const { paddingInlineStart, paddingInlineEnd } = getComputedStyle(box);

  return (
    box.getBoundingClientRect().width -
    Number.parseFloat(paddingInlineStart) -
    Number.parseFloat(paddingInlineEnd)
  );
}

function textBox(element: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(element);

  return range.getBoundingClientRect();
}

/** How far a label, a text or a trailing child is past the item's sides. */
function past(item: Item): number {
  const outer = item.box.getBoundingClientRect();
  const rects = [
    partOf(item, 'label'),
    partOf(item, 'overline'),
    partOf(item, 'support'),
    ...childrenOf(item, 'trail').flatMap((child) => [
      child.getBoundingClientRect(),
      textBox(child),
    ]),
  ].filter(({ width }) => width > 0);

  return Math.max(
    0,
    ...rects.flatMap(({ left, right }) => [
      outer.left - left,
      right - outer.right,
    ]),
  );
}

function widths(elements: readonly Element[]): readonly number[] {
  return elements.map((element) =>
    Math.round(element.getBoundingClientRect().width),
  );
}

describe.each(SETTINGS)('$tag texts in $direction', ({ tag, direction }) => {
  describe.each(CONTENTS)('with %s', (_, html) => {
    it('should be inside the item', async () => {
      expect(past(await createItem(tag, direction, html))).toBeLessThanOrEqual(
        SUBPIXEL,
      );
    });

    it('should add no scroll', async () => {
      const { frame } = await createItem(tag, direction, html);

      expect(frame.scrollWidth - frame.clientWidth).toBe(0);
    });
  });

  it.each([
    ['alone', ''],
    ['beside a video', VIDEO],
    ['beside a large video', LARGE_VIDEO],
  ])('should leave the label room for a long text %s', async (_, lead) => {
    const item = await createItem(tag, direction, `${lead}Label${trail(LONG)}`);

    expect(partOf(item, 'content').width).toBeGreaterThanOrEqual(
      contentSize(item) * LABEL_PART - SUBPIXEL,
    );
  });

  it.each([
    ['beside a video', VIDEO, WIDER_BUTTON],
    ['beside a large video', LARGE_VIDEO, BUTTON],
    ['beside a large video', LARGE_VIDEO, WIDER_BUTTON],
  ])(
    'should leave the label room for a control %s: %s%s',
    async (_, lead, control) => {
      const item = await createItem(tag, direction, `${lead}Label${control}`);

      expect(partOf(item, 'content').width).toBeGreaterThanOrEqual(
        contentSize(item) * LABEL_PART - SUBPIXEL,
      );
    },
  );

  it.each([
    ['a long text', trail(LONG)],
    ['a wide button', WIDE_BUTTON],
  ])('should take at most half of the item with %s', async (_, child) => {
    const item = await createItem(tag, direction, `Label${child}`);

    expect(partOf(item, 'trail').width).toBeLessThanOrEqual(
      contentSize(item) / 2 + SUBPIXEL,
    );
  });

  it.each([
    ['two icons', `Label${ICON}${ICON}`],
    ['two icon buttons', `Label${ICON_BUTTON}${ICON_BUTTON}`],
    ['a text and an icon', `Label${trail('12:30')}${ICON}`],
    ['two texts', `Label${trail('12:30')}${trail('new')}`],
  ])('should put %s side by side', async (_, html) => {
    const item = await createItem(tag, direction, html);
    const [first, second] = childrenOf(item, 'trail').map((child) =>
      child.getBoundingClientRect(),
    );
    // Two Latin texts keep their order in a right-to-left item.
    const gap = Math.max(
      second!.left - first!.right,
      first!.left - second!.right,
    );

    expect(gap).toBeGreaterThanOrEqual(-SUBPIXEL);
  });

  // In an item of 1000 px there is room for each child.
  it.each([
    ['a short text', `Label${trail('12:30')}`],
    ['a short text beside a long label', `${WORDS}${trail('12:30')}`],
    ['a short text beside a video', `${VIDEO}Label${trail('12:30')}`],
    ['two texts', `Label${trail('12:30')}${trail('new')}`],
    ['two icons', `Label${ICON}${ICON}`],
    ['two icon buttons', `Label${ICON_BUTTON}${ICON_BUTTON}`],
    ['a checkbox', `Label${CHECKBOX}`],
    ['a button', `Label${BUTTON}`],
    ['a button beside a video', `${VIDEO}Label${BUTTON}`],
    ['a fixed child beside a video', `${VIDEO}Label${FIXED}`],
    ['a fixed child beside a large video', `${LARGE_VIDEO}Label${FIXED}`],
  ])('should keep the width of %s', async (_, html) => {
    const item = await createItem(tag, direction, html);
    const wide = await createItem(tag, direction, html, 1000);

    expect(widths(childrenOf(item, 'trail'))).toEqual(
      widths(childrenOf(wide, 'trail')),
    );
  });

  it.each([
    ['nothing', ''],
    ['a short text', trail('12:30')],
  ])(
    'should put a wide image in lead over nothing, beside %s',
    async (_, child) => {
      const item = await createItem(tag, direction, `${IMAGE}Label${child}`);
      const [image] = childrenOf(item, 'lead');
      const { left, right, width } = image!.getBoundingClientRect();
      const content = partOf(item, 'content');
      const gap =
        direction === 'ltr' ? content.left - right : left - content.right;

      expect({ width, isOver: gap < -SUBPIXEL }).toEqual({
        width: 180,
        isOver: false,
      });
    },
  );
});
