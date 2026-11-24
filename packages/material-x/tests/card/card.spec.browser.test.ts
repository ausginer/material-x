import { describe, expect, it, onTestFinished } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import type Card from '../../src/card/card.ts';
import type { CardVariant } from '../../src/card/card.ts';
import '../../src/card/card.ts';
import '../../src/checkbox/checkbox.ts';
import { pixels, resolveComputed } from '../browser.ts';

const TAB = server.browser === 'safari' ? '{Alt>}{Tab}{/Alt}' : '{Tab}';

type CardCase = Readonly<{
  name: string;
  variant: CardVariant | null;
  contract: string;
}>;

const FILLED: CardCase = {
  name: 'filled',
  variant: null,
  contract: 'card.filled',
};

const ELEVATED: CardCase = {
  name: 'elevated',
  variant: 'elevated',
  contract: 'card.elevated',
};

const OUTLINED: CardCase = {
  name: 'outlined',
  variant: 'outlined',
  contract: 'card.outlined',
};

const CASES = [FILLED, ELEVATED, OUTLINED];

/**
 * The space between the container's edge and the content.
 *
 * Source: m3.material.io, components/cards/specs, "Left/right padding 16dp".
 * The block value is mx-card's own choice, equal to the inline one, because the
 * specification gives none. Reviewed: 2026-11-23. The card token sets have no
 * padding token, so it can't come from tproc.
 */
const PADDING = 16;

function createCard(
  { variant }: CardCase,
  overrides: Readonly<Record<string, string>> = {},
): Card {
  const card = document.createElement('mx-card');
  card.variant = variant;

  for (const [property, value] of Object.entries(overrides)) {
    card.style.setProperty(property, value);
  }

  const content = document.createElement('div');
  content.style.blockSize = '40px';
  card.append(content);
  document.body.append(card);
  return card;
}

function getSlot(card: Card): HTMLSlotElement {
  return card.shadowRoot!.querySelector('slot')!;
}

async function resolveTokens(
  contract: string,
  ...tokens: readonly string[]
): Promise<Readonly<Record<string, string | number>>> {
  const { values } = await commands.resolveTokenContract({
    contract,
    state: 'default',
    tokens,
  });

  return values;
}

/** The distance from each of the card's edges to its content's edge. */
function contentInset(card: Card): Readonly<Record<string, number>> {
  const outer = card.getBoundingClientRect();
  const inner = card.firstElementChild!.getBoundingClientRect();

  return {
    top: inner.top - outer.top,
    right: outer.right - inner.right,
    bottom: outer.bottom - inner.bottom,
    left: inner.left - outer.left,
  };
}

function insetOf(value: number): Readonly<Record<string, number>> {
  return { top: value, right: value, bottom: value, left: value };
}

function corners(element: Element): readonly string[] {
  const style = getComputedStyle(element);

  return [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ];
}

/** The outline that the host draws. */
function outlineOf(card: Card): Readonly<Record<string, string>> {
  const style = getComputedStyle(card);

  return {
    color: style.outlineColor,
    style: style.outlineStyle,
    width: style.outlineWidth,
    offset: style.outlineOffset,
  };
}

async function expectedOutline(): Promise<Readonly<Record<string, string>>> {
  const values = await resolveTokens(
    OUTLINED.contract,
    'outline.color',
    'outline.width',
  );
  const width = pixels(values['outline.width']!);

  return {
    color: resolveComputed('color', String(values['outline.color'])),
    style: 'solid',
    width: `${width}px`,
    offset: `${-width}px`,
  };
}

/** A page's rule, for the current test. */
function addPageRule(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  onTestFinished(() => style.remove());
}

/** A page's universal reset, as consumers write it, for the current test. */
function addUniversalReset(): void {
  addPageRule('*, *::before, *::after { padding: 0; border: 0; outline: 0; }');
}

/** An outlined card that the consumer made a tab stop, focused by the keyboard. */
async function createFocusedCard(): Promise<Card> {
  const card = createCard(OUTLINED);
  card.tabIndex = 0;
  const before = document.createElement('button');
  card.before(before);
  before.focus();
  await userEvent.keyboard(TAB);
  expect(card.matches(':focus-visible')).toBe(true);
  return card;
}

describe.each(CASES)('mx-card $name container contract', (testCase) => {
  it('should render the container colour', async () => {
    const values = await resolveTokens(testCase.contract, 'container.color');
    const card = createCard(testCase);

    expect(getComputedStyle(card).backgroundColor).toBe(
      resolveComputed('background-color', String(values['container.color'])),
    );
  });

  it('should render the container shape on its four corners', async () => {
    const values = await resolveTokens(testCase.contract, 'container.shape');
    const card = createCard(testCase);

    expect(corners(card)).toEqual(
      Array.from({ length: 4 }, () => values['container.shape']),
    );
  });

  it("should inset the content from the container's edge", () => {
    expect(contentInset(createCard(testCase))).toEqual(insetOf(PADDING));
  });

  it("should keep the inset under a page's universal reset", () => {
    addUniversalReset();

    expect(contentInset(createCard(testCase))).toEqual(insetOf(PADDING));
  });
});

describe('mx-card outline contract', () => {
  it('should render the outline on the outlined card', async () => {
    expect(outlineOf(createCard(OUTLINED))).toEqual(await expectedOutline());
  });

  it("should keep the outline under a page's universal reset", async () => {
    addUniversalReset();

    expect(outlineOf(createCard(OUTLINED))).toEqual(await expectedOutline());
  });

  it('should draw no outline on the slot', () => {
    const slot = getSlot(createCard(OUTLINED));

    expect(getComputedStyle(slot).outlineStyle).toBe('none');
  });

  it("should let the page's focus indicator replace the outline", async () => {
    addPageRule('mx-card:focus-visible { outline: 3px dashed rgb(1, 2, 3); }');

    expect(outlineOf(await createFocusedCard())).toEqual({
      color: 'rgb(1, 2, 3)',
      style: 'dashed',
      width: '3px',
      offset: '0px',
    });
  });

  it("should let the browser's focus indicator replace the outline", async () => {
    expect(outlineOf(await createFocusedCard())['style']).toBe('auto');
  });

  it.each([FILLED, ELEVATED])(
    'should render no outline on the $name card',
    (testCase) => {
      expect(outlineOf(createCard(testCase))['style']).toBe('none');
    },
  );
});

/*
 * The public properties aren't tproc tokens, so the oracle is the value that
 * the row sets.
 */
describe('mx-card public CSS overrides', () => {
  it.each(CASES)(
    'should apply --md-card-container-color to the $name container',
    (testCase) => {
      const card = createCard(testCase, {
        '--md-card-container-color': 'rgb(1, 2, 3)',
      });

      expect(getComputedStyle(card).backgroundColor).toBe('rgb(1, 2, 3)');
    },
  );

  it('should apply --md-card-container-shape to the container', () => {
    const card = createCard(OUTLINED, { '--md-card-container-shape': '20px' });

    expect(corners(card)).toEqual(Array.from({ length: 4 }, () => '20px'));
  });

  it('should apply --md-card-outline-color to the outline', () => {
    const card = createCard(OUTLINED, {
      '--md-card-outline-color': 'rgb(1, 2, 3)',
    });

    expect(outlineOf(card)['color']).toBe('rgb(1, 2, 3)');
  });

  it('should apply --md-card-padding to the inset', () => {
    expect(
      contentInset(createCard(FILLED, { '--md-card-padding': '0' })),
    ).toEqual(insetOf(0));
  });
});

describe('mx-card content', () => {
  it('should fill a card that a grid stretches', () => {
    const card = createCard(FILLED);
    const content = card.firstElementChild as HTMLElement;
    content.style.blockSize = '100%';
    const grid = document.createElement('div');
    grid.style.cssText =
      'display: grid; grid-template-columns: 200px 200px; align-items: stretch;';
    const tall = document.createElement('div');
    tall.style.blockSize = '300px';
    grid.append(card, tall);
    document.body.append(grid);

    // The row measures a card that the grid stretches past its content.
    expect(card.getBoundingClientRect().height).toBe(300);
    expect(contentInset(card)).toEqual(insetOf(PADDING));
  });

  // An unchecked checkbox sets no container colour, so it paints the one it
  // inherits.
  it('should not give its container colour to a checkbox inside it', () => {
    const card = createCard(FILLED);
    const checkbox = document.createElement('mx-checkbox');
    card.append(checkbox);

    expect(getComputedStyle(checkbox, '::after').backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    );
  });
});
