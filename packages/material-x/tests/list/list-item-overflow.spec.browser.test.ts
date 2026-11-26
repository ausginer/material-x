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
const FIXED_200 =
  '<span slot="trail" style="display: block; inline-size: 200px; block-size: 24px"></span>';
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

/** The number of lines that the text in `element` is laid out in. */
function lines(element: Element): number {
  const range = document.createRange();
  range.selectNodeContents(element);

  return linesOf(range);
}

function linesOf(range: Range): number {
  return new Set(
    [...range.getClientRects()]
      .filter(({ width }) => width > 0)
      .map(({ top }) => Math.round(top)),
  ).size;
}

/** The number of lines that each word of `element`'s text is laid out in. */
function linesOfWords(element: Element): readonly number[] {
  const text = element.firstChild!;

  return [...text.textContent!.matchAll(/\S+/gu)].map(({ index, 0: word }) => {
    const range = document.createRange();
    range.setStart(text, index);
    range.setEnd(text, index + word.length);

    return linesOf(range);
  });
}

/** Where a box starts and ends, from the item's start in its direction. */
function extent({ box }: Item, rect: DOMRect): readonly [number, number] {
  const outer = box.getBoundingClientRect();

  return getComputedStyle(box).direction === 'rtl'
    ? [outer.right - rect.right, outer.right - rect.left]
    : [rect.left - outer.left, rect.right - outer.left];
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

  it("should end a short text at the item's end and give the label the rest", async () => {
    const item = await createItem(tag, direction, `Label${trail('12:30')}`);
    const [text] = childrenOf(item, 'trail');
    const shadow = item.element.shadowRoot!;
    const slot = shadow.querySelector('.trail')!;
    const [, contentEnd] = extent(item, partOf(item, 'content'));
    const [textStart, textEnd] = extent(item, text!.getBoundingClientRect());
    const itemEnd =
      item.box.getBoundingClientRect().width -
      Number.parseFloat(getComputedStyle(item.box).paddingInlineEnd) -
      Number.parseFloat(getComputedStyle(slot).marginInlineEnd);
    const between =
      Number.parseFloat(
        getComputedStyle(shadow.querySelector('.content')!).marginInlineEnd,
      ) + Number.parseFloat(getComputedStyle(slot).marginInlineStart);

    expect(Math.abs(textEnd - itemEnd)).toBeLessThanOrEqual(1);
    expect(Math.abs(textStart - between - contentEnd)).toBeLessThanOrEqual(1);
  });

  // Between 41 and 49 % of the item's content width.
  it.each([
    ['a text', trail('Some text of nearly half')],
    ['a button', '<mx-button slot="trail">Send it to them</mx-button>'],
  ])(
    'should keep the width and one line of %s of nearly half of the item',
    async (_, child) => {
      const item = await createItem(tag, direction, `Label${child}`);
      const wide = await createItem(tag, direction, `Label${child}`, 1000);
      const [own] = childrenOf(wide, 'trail');
      const [kept] = childrenOf(item, 'trail');
      const ownWidth = own!.getBoundingClientRect().width;
      const share = ownWidth / contentSize(item);

      expect({
        isNearlyHalf: share > 0.41 && share < 0.49,
        width: kept!.getBoundingClientRect().width,
        lines: lines(item.element.querySelector('[slot="trail"]')!),
      }).toEqual({ isNearlyHalf: true, width: ownWidth, lines: 1 });
    },
  );

  it('should keep a fixed child wider than half of the item in it', async () => {
    expect(
      past(await createItem(tag, direction, `Label${FIXED_200}`)),
    ).toBeLessThanOrEqual(SUBPIXEL);
  });

  it("should keep the large video's width beside a fixed child", async () => {
    const item = await createItem(
      tag,
      direction,
      `${LARGE_VIDEO}Label${FIXED}`,
    );
    const [video] = childrenOf(item, 'lead');

    expect(partOf(item, 'lead').width).toBeCloseTo(
      video!.getBoundingClientRect().width,
      0,
    );
  });
});

// A control's label breaks between its words and not inside them.
describe.each(
  SETTINGS.filter(({ tag }) => tag !== 'mx-list-link-item').flatMap((setting) =>
    [240, 280, 300].map((width) => ({ ...setting, width })),
  ),
)(
  '$tag control beside a video in $direction, $width px',
  ({ tag, direction, width }) => {
    it('should keep the width and one line of a button of one word', async () => {
      const html = `${VIDEO}Label<mx-button slot="trail">Download</mx-button>`;
      const item = await createItem(tag, direction, html, width);
      const wide = await createItem(tag, direction, html, 1000);
      const [button] = childrenOf(item, 'trail');

      expect({
        width: button!.getBoundingClientRect().width,
        lines: lines(item.element.querySelector('mx-button')!),
      }).toEqual({
        width: childrenOf(wide, 'trail')[0]!.getBoundingClientRect().width,
        lines: 1,
      });
    });

    it('should break a button of two words between them', async () => {
      const item = await createItem(
        tag,
        direction,
        `${VIDEO}Label<mx-button slot="trail">Two words</mx-button>`,
        width,
      );
      const button = item.element.querySelector('mx-button')!;

      expect({
        hasAtMostTwoLines: lines(button) <= 2,
        words: linesOfWords(button),
      }).toEqual({ hasAtMostTwoLines: true, words: [1, 1] });
    });
  },
);
