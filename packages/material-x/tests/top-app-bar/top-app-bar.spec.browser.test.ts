import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/icon/icon.ts';
import '../../src/top-app-bar/top-app-bar.ts';
import { nextFrame, pixels, resolveComputed } from '../browser.ts';

/**
 * Lengths that no token gives. They can't come from tproc, because upstream's
 * `md.comp.app-bar` sets hold only the edge spaces and the space between the
 * actions.
 */
const LITERALS = {
  betweenSpace: {
    value: 4,
    source:
      'https://m3.material.io/components/app-bars/specs, the small app bar’s measurements',
    reviewed: '2026-11-23',
    reason: 'the space between a slot’s target and the headline has no token',
  },
  headlineSpace: {
    value: 16,
    source:
      'https://m3.material.io/components/app-bars/specs, the headline’s inset in the medium app bar',
    reviewed: '2026-11-23',
    reason: 'the spec gives no figure for an empty slot of the small app bar',
  },
} as const;

const BETWEEN = LITERALS.betweenSpace.value;
const HEADLINE = LITERALS.headlineSpace.value;

type Content = Readonly<{
  lead?: boolean;
  trail?: number;
  headline?: string;
}>;

type Fixture = Readonly<{
  bar: HTMLElement;
  heading: HTMLElement;
  lead?: HTMLElement;
  trail: readonly HTMLElement[];
}>;

function createIcon(slot: string): HTMLElement {
  const icon = document.createElement('mx-icon');
  icon.slot = slot;
  icon.textContent = 'check';
  return icon;
}

/** A bar with an `<h1>` headline, on a page taller than the viewport. */
async function createBar({
  lead = true,
  trail = 2,
  headline = 'Headline',
}: Content = {}): Promise<Fixture> {
  const bar = document.createElement('mx-top-app-bar');
  const heading = document.createElement('h1');
  heading.textContent = headline;
  const leadIcon = lead ? createIcon('lead') : undefined;
  const trailIcons = Array.from({ length: trail }, () => createIcon('trail'));
  bar.append(...(leadIcon ? [leadIcon] : []), heading, ...trailIcons);

  const tall = document.createElement('div');
  tall.style.height = '3000px';
  document.body.append(bar, tall);
  await nextFrame();

  return { bar, heading, lead: leadIcon, trail: trailIcons };
}

function addPageRule(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  onTestFinished(() => style.remove());
}

async function scrollPage(bar: HTMLElement): Promise<void> {
  scrollTo({ top: 300, behavior: 'instant' });
  await expect.poll(() => bar.matches(':state(scrolled)')).toBe(true);
}

/** Ends the running color change, so that the end value is computed. */
function settle(bar: HTMLElement): void {
  for (const animation of bar.getAnimations()) {
    animation.finish();
  }
}

async function resolveTokens(
  tokens: readonly string[],
  state = 'default',
): Promise<Readonly<Record<string, string | number>>> {
  const { values } = await commands.resolveTokenContract({
    contract: 'top-app-bar.default',
    state,
    tokens,
  });

  return values;
}

/** The distances along the inline axis, from the bar's start to its end. */
function readInsets({ bar, heading, lead, trail }: Fixture) {
  const rtl = getComputedStyle(bar).direction === 'rtl';
  const box = bar.getBoundingClientRect();
  const span = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();

    return rtl
      ? { start: box.right - rect.right, end: box.right - rect.left }
      : { start: rect.left - box.left, end: rect.right - box.left };
  };
  const text = span(heading);
  const leadSpan = lead ? span(lead) : undefined;
  const actions = trail.map(span);

  return {
    edgeToLead: leadSpan?.start,
    beforeHeadline: text.start - (leadSpan?.end ?? 0),
    afterHeadline: (actions[0]?.start ?? box.width) - text.end,
    betweenActions: actions[1] && actions[1].start - actions[0]!.end,
    trailToEdge: actions.at(-1) && box.width - actions.at(-1)!.end,
  };
}

afterEach(() => {
  scrollTo({ top: 0, behavior: 'instant' });
});

describe('mx-top-app-bar container contract', () => {
  it('should render the container color at rest', async () => {
    const values = await resolveTokens(['container.color']);
    const { bar } = await createBar();

    expect(getComputedStyle(bar).backgroundColor).toBe(
      resolveComputed('background-color', String(values['container.color'])),
    );
  });

  it('should render the on-scroll container color when scrolled', async () => {
    const values = await resolveTokens(['container.color'], 'scrolled');
    const { bar } = await createBar();

    await scrollPage(bar);
    settle(bar);

    expect(getComputedStyle(bar).backgroundColor).toBe(
      resolveComputed('background-color', String(values['container.color'])),
    );
  });

  it.each([
    ['top-left', 'border-top-left-radius'],
    ['top-right', 'border-top-right-radius'],
    ['bottom-right', 'border-bottom-right-radius'],
    ['bottom-left', 'border-bottom-left-radius'],
  ] as const)('should render the %s corner', async (corner, property) => {
    const token = `container.shape.${corner}`;
    const values = await resolveTokens([token]);
    const { bar } = await createBar();

    expect(getComputedStyle(bar).getPropertyValue(property)).toBe(
      values[token],
    );
  });

  it('should render the container height', async () => {
    const values = await resolveTokens(['container.height']);
    const { bar } = await createBar();

    expect(bar.getBoundingClientRect().height).toBe(
      pixels(values['container.height']!),
    );
  });

  it('should draw no shadow when scrolled', async () => {
    const { bar } = await createBar();

    await scrollPage(bar);

    expect(
      [undefined, '::before', '::after'].map(
        (pseudo) => getComputedStyle(bar, pseudo).boxShadow,
      ),
    ).toEqual(['none', 'none', 'none']);
  });

  it('should change the color over the motion duration and easing', async () => {
    const values = await resolveTokens(['scroll.duration', 'scroll.easing']);
    const { bar } = await createBar();

    await scrollPage(bar);
    const transitions = bar
      .getAnimations()
      .filter((animation) => animation instanceof CSSTransition);

    expect(
      transitions.map((transition) => {
        const { duration, easing } = transition.effect!.getTiming();

        return [transition.transitionProperty, duration, easing];
      }),
    ).toEqual([
      [
        'background-color',
        Number.parseFloat(
          resolveComputed(
            'transition-duration',
            String(values['scroll.duration']),
          ),
        ) * 1000,
        resolveComputed(
          'transition-timing-function',
          String(values['scroll.easing']),
        ),
      ],
    ]);
  });
});

describe('mx-top-app-bar CSS properties', () => {
  it('should render --md-top-app-bar-container-color at rest', async () => {
    const { bar } = await createBar();
    bar.style.setProperty('--md-top-app-bar-container-color', 'rgb(1, 2, 3)');
    settle(bar);

    expect(getComputedStyle(bar).backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('should render --md-top-app-bar-on-scroll-container-color when scrolled', async () => {
    const { bar } = await createBar();
    bar.style.setProperty(
      '--md-top-app-bar-on-scroll-container-color',
      'rgb(4, 5, 6)',
    );

    await scrollPage(bar);
    settle(bar);

    expect(getComputedStyle(bar).backgroundColor).toBe('rgb(4, 5, 6)');
  });
});

const TEXT_STYLE = [
  ['color', 'title.color'],
  ['font-family', 'title.font.font-name'],
  ['font-size', 'title.font.font-size'],
  ['font-weight', 'title.font.font-weight'],
  ['line-height', 'title.font.line-height'],
  ['letter-spacing', 'title.font.font-tracking'],
] as const;

describe('mx-top-app-bar headline contract', () => {
  // The bar's surroundings set every property to a value that isn't the
  // token's, so a row fails if the headline only inherits it. The selector beats
  // the test page's own `.mx-test-body`.
  const SURROUNDINGS =
    'body.mx-test-body { font: italic 900 9px/99px serif; letter-spacing: 3px; color: red; }';

  describe.each(TEXT_STYLE)('%s', (property, token) => {
    it('should apply to text', async () => {
      const values = await resolveTokens([token]);
      addPageRule(SURROUNDINGS);
      const { bar } = await createBar();
      const text = document.createElement('span');
      text.textContent = 'Text';
      bar.replaceChildren(text);

      expect(getComputedStyle(text).getPropertyValue(property)).toBe(
        resolveComputed(property, String(values[token])),
      );
    });

    it('should apply to a slotted h1', async () => {
      const values = await resolveTokens([token]);
      addPageRule(SURROUNDINGS);
      const { heading } = await createBar();

      expect(getComputedStyle(heading).getPropertyValue(property)).toBe(
        resolveComputed(property, String(values[token])),
      );
    });
  });

  it('should leave a slotted h1 with no margin', async () => {
    const { heading } = await createBar();

    expect(getComputedStyle(heading).margin).toBe('0px');
  });

  it("should let the page's rule style a slotted h1", async () => {
    addPageRule('h1 { font-size: 30px; }');
    const { heading } = await createBar();

    expect(getComputedStyle(heading).fontSize).toBe('30px');
  });

  it.each([
    ['words', 'A headline that takes more than one line of a narrow bar'],
    ['one long word', 'Donaudampfschifffahrtselektrizitätenhauptbetriebswerk'],
  ])('should wrap a long headline of %s without a cut', async (_, headline) => {
    const values = await resolveTokens(['container.height']);
    const { bar, heading, trail } = await createBar({ headline });
    bar.style.inlineSize = '240px';
    await nextFrame();
    const box = bar.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(heading);
    const text = range.getBoundingClientRect();

    expect({
      grows: box.height > pixels(values['container.height']!),
      within:
        text.top >= box.top &&
        text.bottom <= box.bottom &&
        text.right <= trail[0]!.getBoundingClientRect().left,
      trailWithin: trail.at(-1)!.getBoundingClientRect().right <= box.right,
      overflow: getComputedStyle(bar).overflow,
    }).toEqual({
      grows: true,
      within: true,
      trailWithin: true,
      overflow: 'visible',
    });
  });
});

describe('mx-top-app-bar icon contract', () => {
  it.each([
    ['lead', 'leading-icon.color'],
    ['trail', 'trailing-icon.color'],
  ] as const)('should render the %s icon color', async (slot, token) => {
    const values = await resolveTokens([token]);
    const { bar } = await createBar();
    const icon = bar.querySelector(`[slot=${slot}]`)!;

    expect(getComputedStyle(icon).color).toBe(
      resolveComputed('color', String(values[token])),
    );
  });

  it.each(['lead', 'trail'])('should render the %s icon size', async (slot) => {
    const values = await resolveTokens(['icon.size']);
    const { bar } = await createBar();
    const { width, height } = bar
      .querySelector(`[slot=${slot}]`)!
      .getBoundingClientRect();
    const size = pixels(values['icon.size']!);

    expect([width, height]).toEqual([size, size]);
  });

  it('should center the content on the block axis', async () => {
    const { bar, heading, lead, trail } = await createBar();
    const center = (element: HTMLElement) => {
      const { top, height } = element.getBoundingClientRect();
      return top + height / 2;
    };

    expect([lead!, heading, ...trail].map(center)).toEqual(
      Array.from({ length: 4 }, () => center(bar)),
    );
  });
});

describe('mx-top-app-bar slot layout', () => {
  it.each(['lead', 'trail'])(
    'should keep the width of %s in a bar that is too narrow',
    async (slot) => {
      const { bar } = await createBar({ lead: false, trail: 0 });
      const text = document.createElement('span');
      text.slot = slot;
      text.textContent = 'Several words that can wrap';
      bar.append(text);
      await nextFrame();
      const { width } = text.getBoundingClientRect();
      bar.style.inlineSize = '120px';
      await nextFrame();

      expect([width > 120, text.getBoundingClientRect().width]).toEqual([
        true,
        width,
      ]);
    },
  );

  it.each(['lead', 'trail'])(
    'should center content of different heights in %s',
    async (slot) => {
      const { bar } = await createBar({ lead: false, trail: 0 });
      const items = [20, 40].map((size) => {
        const item = document.createElement('div');
        item.slot = slot;
        item.style.cssText = `inline-size: 20px; block-size: ${size}px;`;
        return item;
      });
      bar.append(...items);
      await nextFrame();
      const box = bar.getBoundingClientRect();

      expect(
        items.map((item) => item.getBoundingClientRect().top - box.top),
      ).toEqual([20, 40].map((size) => (box.height - size) / 2));
    },
  );
});

describe('mx-top-app-bar inset contract', () => {
  const CASES: ReadonlyArray<readonly [string, Content]> = [
    ['lead and trail', {}],
    ['no lead', { lead: false }],
    ['no trail', { trail: 0 }],
    ['a headline only', { lead: false, trail: 0 }],
  ];

  describe.each(['ltr', 'rtl'])('%s', (dir) => {
    it.each(CASES)('should place the content with %s', async (_, content) => {
      const values = await resolveTokens([
        'leading-space',
        'trailing-space',
        'icon-button-space',
      ]);
      const fixture = await createBar(content);
      const { lead = true, trail = 2 } = content;
      fixture.bar.dir = dir;

      expect(readInsets(fixture)).toEqual({
        edgeToLead: lead ? pixels(values['leading-space']!) : undefined,
        beforeHeadline: lead ? BETWEEN : HEADLINE,
        afterHeadline: trail ? BETWEEN : HEADLINE,
        betweenActions: trail
          ? pixels(values['icon-button-space']!)
          : undefined,
        trailToEdge: trail ? pixels(values['trailing-space']!) : undefined,
      });
    });
  });

  it.each(CASES)(
    "should keep the insets under a page's universal reset with %s",
    async (_, content) => {
      const plain = readInsets(await createBar(content));
      document.body.replaceChildren();
      addPageRule(
        '*, ::before, ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid; }',
      );

      expect(readInsets(await createBar(content))).toEqual(plain);
    },
  );
});
