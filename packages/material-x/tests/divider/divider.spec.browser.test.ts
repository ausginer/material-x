import { afterEach, describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import '../../src/card/card.ts';
import type Divider from '../../src/divider/divider.ts';
import '../../src/divider/divider.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list.ts';
import { capture, pixels, resolveComputed } from '../browser.ts';

const CONTRACT = 'divider';

/**
 * The inset at the start, and at each side of a middle inset.
 *
 * Source: m3.material.io, components/divider/specs, _Measurements_: "Divider
 * inset left margin 16dp", "Divider middle-inset left margin 16dp" and "right
 * margin 16dp". Reviewed: 2026-11-27. `md.comp.divider` has only `color` and
 * `thickness`, so it can't come from tproc.
 */
const INSET = 16;

/**
 * `mx-card`'s default padding. Source: m3.material.io, components/cards/specs,
 * "Left/right padding 16dp". Reviewed: 2026-11-23. No card token gives it.
 */
const CARD_PADDING = 16;

/** The width of every container that the rows put a divider in. */
const WIDTH = 320;

/** The height of the flex row that a vertical divider stretches in. */
const ROW_HEIGHT = 48;

/**
 * A universal reset as pages write it. A page rule beats the divider's `:host`
 * rules, except their `!important` declarations.
 */
const RESET =
  '*, *::before, *::after { margin: 0; padding: 0; border: 0 solid; }';

type Attributes = Readonly<Record<string, string>>;

/** A line's distances from a box's start and end edges, and its size. */
type Extent = Readonly<{ start: number; end: number; size: number }>;

const INSETS = [
  ['full-width', {}, 0, 0],
  ['start', { inset: 'start' }, INSET, 0],
  ['middle', { inset: 'middle' }, INSET, INSET],
] as const;

afterEach(async () => {
  document.getElementById('page-style')?.remove();
  await commands.emulateForcedColors(false);
});

function addPageStyle(css: string): void {
  const style = document.createElement('style');
  style.id = 'page-style';
  style.textContent = css;
  document.head.append(style);
}

function createDivider(attributes: Attributes = {}): Divider {
  const divider = document.createElement('mx-divider');
  for (const [name, value] of Object.entries(attributes)) {
    divider.setAttribute(name, value);
  }
  return divider;
}

/** A 320px-wide block that holds `content`, in the document. */
function createContainer(...content: readonly Node[]): HTMLDivElement {
  const container = document.createElement('div');
  container.style.inlineSize = `${WIDTH}px`;
  container.append(...content);
  document.body.append(container);
  return container;
}

/** A 48px-high flex row with text on each side of `divider`. */
function createRow(divider: Divider): HTMLDivElement {
  const before = document.createElement('span');
  before.textContent = 'Before';
  const after = document.createElement('span');
  after.textContent = 'After';
  const row = createContainer(before, divider, after);
  row.style.display = 'flex';
  row.style.blockSize = `${ROW_HEIGHT}px`;
  return row;
}

/**
 * The line's box: the host's `DOMRect` less its padding, because the line is
 * the host's background clipped to its content box. The rows under _painted
 * inside its own box_ read what is painted.
 */
function lineBox(divider: Divider) {
  const rect = divider.getBoundingClientRect();
  const style = getComputedStyle(divider);
  const left = rect.left + pixels(style.paddingLeft);
  const right = rect.right - pixels(style.paddingRight);
  const top = rect.top + pixels(style.paddingTop);
  const bottom = rect.bottom - pixels(style.paddingBottom);

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

/** The line's distances from `box`'s start and end edges, and its width. */
function extentIn(divider: Divider, box: Element): Extent {
  const line = lineBox(divider);
  const outer = box.getBoundingClientRect();
  const fromLeft = line.left - outer.left;
  const fromRight = outer.right - line.right;

  return getComputedStyle(box).direction === 'rtl'
    ? { start: fromRight, end: fromLeft, size: line.width }
    : { start: fromLeft, end: fromRight, size: line.width };
}

/** The line's distances from `box`'s block edges, and its height. */
function blockExtentIn(divider: Divider, box: Element): Extent {
  const line = lineBox(divider);
  const outer = box.getBoundingClientRect();

  return {
    start: line.top - outer.top,
    end: outer.bottom - line.bottom,
    size: line.height,
  };
}

/** The extent of a line in a box `size` long, with `start` and `end` insets. */
function extent(size: number, start: number, end: number): Extent {
  return { start, end, size: size - start - end };
}

async function resolveTokens(...tokens: readonly string[]) {
  const { values } = await commands.resolveTokenContract({
    contract: CONTRACT,
    state: 'default',
    tokens,
  });

  return values;
}

async function thickness(): Promise<number> {
  return pixels(String((await resolveTokens('thickness'))['thickness']!));
}

async function color(): Promise<string> {
  return resolveComputed(
    'color',
    String((await resolveTokens('color'))['color']!),
  );
}

describe('mx-divider visual contract', () => {
  describe('line', () => {
    it('should draw the line in the tokenized color', async () => {
      const divider = createDivider();
      createContainer(divider);

      expect(getComputedStyle(divider).backgroundColor).toBe(await color());
    });

    it('should paint only its content box', () => {
      const divider = createDivider({ inset: 'middle' });
      createContainer(divider);

      expect(getComputedStyle(divider).backgroundClip).toBe('content-box');
    });

    it('should give the horizontal line the tokenized thickness', async () => {
      const divider = createDivider();
      createContainer(divider);

      expect([
        lineBox(divider).height,
        divider.getBoundingClientRect().height,
      ]).toStrictEqual([await thickness(), await thickness()]);
    });

    it('should give the vertical line the tokenized thickness', async () => {
      const divider = createDivider({ orientation: 'vertical' });
      createRow(divider);

      expect([
        lineBox(divider).width,
        divider.getBoundingClientRect().width,
      ]).toStrictEqual([await thickness(), await thickness()]);
    });

    it('should draw the vertical line in the tokenized color', async () => {
      const divider = createDivider({ orientation: 'vertical' });
      createRow(divider);

      expect(getComputedStyle(divider).backgroundColor).toBe(await color());
    });
  });

  describe('insets', () => {
    it.each(INSETS)(
      'should place a %s line in its container',
      (_, attributes, start, end) => {
        const divider = createDivider(attributes);
        const container = createContainer(divider);

        expect(extentIn(divider, container)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it.each(INSETS)(
      'should mirror a %s line in a right-to-left container',
      (_, attributes, start, end) => {
        const divider = createDivider(attributes);
        const container = createContainer(divider);
        container.dir = 'rtl';

        expect(extentIn(divider, container)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it.each(INSETS)(
      'should keep a %s line under a universal reset',
      (_, attributes, start, end) => {
        addPageStyle(RESET);
        const divider = createDivider(attributes);
        const container = createContainer(divider);

        expect(extentIn(divider, container)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it('should keep the line thickness under a universal reset', async () => {
      addPageStyle(RESET);
      const divider = createDivider();
      createContainer(divider);

      expect(lineBox(divider).height).toBe(await thickness());
    });

    it.each(INSETS)(
      "should keep a %s line under a page's padding on the divider",
      (_, attributes, start, end) => {
        const divider = createDivider(attributes);
        divider.style.padding = '8px 24px';
        const container = createContainer(divider);

        expect(extentIn(divider, container)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );
  });

  describe('vertical', () => {
    it.each(INSETS)(
      'should measure a %s inset from the block start of a 48px flex row',
      (_, attributes, start, end) => {
        const divider = createDivider({
          ...attributes,
          orientation: 'vertical',
        });
        const row = createRow(divider);

        expect(blockExtentIn(divider, row)).toStrictEqual(
          extent(ROW_HEIGHT, start, end),
        );
      },
    );
  });

  describe('custom properties', () => {
    it('should take its color from --md-divider-color', () => {
      const divider = createDivider();
      divider.style.setProperty('--md-divider-color', 'rgb(1, 2, 3)');
      createContainer(divider);

      expect(getComputedStyle(divider).backgroundColor).toBe('rgb(1, 2, 3)');
    });

    it('should take its thickness from --md-divider-thickness', () => {
      const divider = createDivider();
      divider.style.setProperty('--md-divider-thickness', '4px');
      createContainer(divider);

      expect(lineBox(divider).height).toBe(4);
    });
  });

  describe('page margins', () => {
    it("should apply the page's margin-block and margin-inline-start", async () => {
      const divider = createDivider();
      divider.style.margin = '8px 0 8px 24px';
      const container = createContainer(divider);
      container.style.display = 'flow-root';

      expect({
        inline: extentIn(divider, container),
        block: blockExtentIn(divider, container),
      }).toStrictEqual({
        inline: extent(WIDTH, 24, 0),
        block: extent(16 + (await thickness()), 8, 8),
      });
    });
  });

  // Playwright emulates forced colors in Chromium and Firefox, not WebKit.
  describe.skipIf(server.browser === 'webkit')('forced colors', () => {
    it('should draw the line in CanvasText', async () => {
      await commands.emulateForcedColors(true);
      const divider = createDivider();
      createContainer(divider);

      expect(getComputedStyle(divider).backgroundColor).toBe(
        resolveComputed('color', 'CanvasText'),
      );
    });
  });

  describe('in mx-list', () => {
    it('should take the list width', () => {
      const list = document.createElement('mx-list');
      const divider = createDivider();
      list.append(
        document.createElement('mx-list-item'),
        divider,
        document.createElement('mx-list-item'),
      );
      createContainer(list);

      expect(extentIn(divider, list)).toStrictEqual(extent(WIDTH, 0, 0));
    });
  });

  describe('in mx-card', () => {
    function createCard(
      divider: Divider,
      style: Readonly<Record<string, string>> = {},
    ): HTMLElement {
      const card = document.createElement('mx-card');
      for (const [property, value] of Object.entries(style)) {
        card.style.setProperty(property, value);
      }
      const above = document.createElement('p');
      above.textContent = 'Above';
      card.append(above, divider);
      createContainer(card);
      return card;
    }

    const PADDINGS = [
      ['the default padding', {}],
      [
        '--md-card-padding-inline: 24px',
        { '--md-card-padding-inline': '24px' },
      ],
      ['--md-card-padding-inline: 0', { '--md-card-padding-inline': '0' }],
      [
        'a block padding that differs',
        {
          '--md-card-padding-block': '8px',
          '--md-card-padding-inline': '24px',
        },
      ],
    ] as const;

    it.each(PADDINGS)(
      "should span the card's border box with %s",
      (_, style) => {
        const divider = createDivider();
        const card = createCard(divider, style);

        expect(extentIn(divider, card)).toStrictEqual(extent(WIDTH, 0, 0));
      },
    );

    it.each(INSETS)(
      "should measure a %s inset from the card's edges",
      (_, attributes, start, end) => {
        const divider = createDivider(attributes);
        const card = createCard(divider);

        expect(extentIn(divider, card)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it.each(INSETS)(
      "should mirror a %s inset from the card's edges in a right-to-left card",
      (_, attributes, start, end) => {
        const divider = createDivider(attributes);
        const card = createCard(divider);
        card.dir = 'rtl';

        expect(extentIn(divider, card)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it.each(INSETS)(
      "should measure a %s inset from the card's edges under a universal reset",
      (_, attributes, start, end) => {
        addPageStyle(RESET);
        const divider = createDivider(attributes);
        const card = createCard(divider);

        expect(extentIn(divider, card)).toStrictEqual(
          extent(WIDTH, start, end),
        );
      },
    );

    it("should ignore the page's margin-inline-start on the divider", () => {
      const divider = createDivider();
      divider.style.marginInlineStart = '56px';
      const card = createCard(divider);

      expect(extentIn(divider, card)).toStrictEqual(extent(WIDTH, 0, 0));
    });

    it("should apply the page's margin-block on the divider", () => {
      const divider = createDivider();
      divider.style.marginBlock = '8px';
      const card = createCard(divider);
      const above = card.firstElementChild as HTMLElement;
      above.style.margin = '0';

      expect({
        above: lineBox(divider).top - above.getBoundingClientRect().bottom,
        below:
          card.getBoundingClientRect().bottom -
          CARD_PADDING -
          divider.getBoundingClientRect().bottom,
      }).toStrictEqual({ above: 8, below: 8 });
    });

    it('should leave a vertical direct child as it is outside a card', async () => {
      const divider = createDivider({ orientation: 'vertical' });
      const card = createCard(divider, {
        display: 'flex',
        'block-size': '80px',
      });
      const box = card.getBoundingClientRect();
      const line = lineBox(divider);

      expect({
        width: line.width,
        top: line.top - box.top,
        bottom: box.bottom - line.bottom,
      }).toStrictEqual({
        width: await thickness(),
        top: CARD_PADDING,
        bottom: CARD_PADDING,
      });
    });

    it('should leave a divider in a child of the card as it is outside a card', () => {
      const divider = createDivider();
      const child = document.createElement('div');
      child.append(divider);
      const card = document.createElement('mx-card');
      card.append(child);
      createContainer(card);

      expect(extentIn(divider, card)).toStrictEqual(
        extent(WIDTH, CARD_PADDING, CARD_PADDING),
      );
    });
  });

  /*
   * The divider's side of the card's contract: a negative inline margin pulls
   * its box out, and the line is painted inside that box. These rows read the
   * painted pixels of a 4px red line in a white container with 16px of
   * padding, with a page `margin-inline: -16px` on the divider.
   */
  describe('painted inside its own box', () => {
    const RED = 'rgb(255, 0, 0)';

    /** The first and last red columns of the line's middle row of pixels. */
    async function paintedColumns(
      attributes: Attributes,
    ): Promise<readonly [number, number]> {
      const divider = createDivider(attributes);
      divider.style.setProperty('--md-divider-color', RED);
      divider.style.setProperty('--md-divider-thickness', '4px');
      divider.style.marginInline = '-16px';
      const container = createContainer(divider);
      container.style.padding = '16px';
      container.style.boxSizing = 'border-box';
      container.style.background = 'white';
      const image = await capture(container);
      const row = Math.floor(image.height / 2);
      const red: number[] = [];

      for (let column = 0; column < image.width; column++) {
        const at = (row * image.width + column) * 4;
        const [r = 0, g = 0, b = 0] = image.data.slice(at, at + 3);

        if (r > 200 && g < 60 && b < 60) {
          red.push(column);
        }
      }

      return [red[0] ?? -1, red.at(-1) ?? -1];
    }

    it("should paint a full-width line across the container's border box", async () => {
      expect(await paintedColumns({})).toStrictEqual([0, WIDTH - 1]);
    });

    it('should paint a start line from 16px of the border box', async () => {
      expect(await paintedColumns({ inset: 'start' })).toStrictEqual([
        INSET,
        WIDTH - 1,
      ]);
    });
  });
});
