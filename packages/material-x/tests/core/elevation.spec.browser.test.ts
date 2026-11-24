import { afterEach, describe, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/card/card.ts';
import '../../src/fab/fab.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

type ElevationLayers = Readonly<{
  penumbra: string;
  umbra: string;
  ambient: string;
}>;

const LAYER_TOKENS = [
  'elevation.penumbra',
  'elevation.umbra',
  'elevation.ambient',
] as const;

/**
 * The shadows the elevation tokens give at `level` in `shadowColor`, as the
 * browser serializes them. Each layer token is a `box-shadow` over `--_level`
 * and `--_shadow-color`, so a probe in the document resolves it under the
 * fixture's theme. tproc ends each layer with `;`, which a declaration value
 * can't hold.
 *
 * The colour is a component's shadow-colour token, resolved by the bridge and
 * not read from the component, so a row sees the colour the box draws.
 */
async function expectedLayers(
  level: string | number,
  shadowColor: string | number,
): Promise<ElevationLayers> {
  const { values } = await commands.resolveTokenContract({
    contract: 'elevation',
    state: 'default',
    tokens: LAYER_TOKENS,
  });

  const resolve = (token: (typeof LAYER_TOKENS)[number]): string => {
    const probe = document.createElement('div');
    probe.style.setProperty('--_level', String(level));
    probe.style.setProperty('--_shadow-color', String(shadowColor));
    probe.style.setProperty(
      'box-shadow',
      String(values[token]!).replace(/;$/u, ''),
    );
    document.body.append(probe);
    const shadow = getComputedStyle(probe).boxShadow;
    probe.remove();
    return shadow;
  };

  return {
    penumbra: resolve('elevation.penumbra'),
    umbra: resolve('elevation.umbra'),
    ambient: resolve('elevation.ambient'),
  };
}

/**
 * The three shadows `box` draws: on a `.host`, its own, and its `::before` and
 * `::after`. On a host that is its box, the three in its one list, in order.
 */
function renderedLayers(box: Element): ElevationLayers {
  const { boxShadow } = getComputedStyle(box);

  if (!box.shadowRoot) {
    return {
      penumbra: boxShadow,
      umbra: getComputedStyle(box, '::before').boxShadow,
      ambient: getComputedStyle(box, '::after').boxShadow,
    };
  }

  // A comma inside a colour function doesn't separate two shadows.
  const layers = boxShadow.split(/, (?![^(]*\))/u);
  expect(layers).toHaveLength(3);
  const [umbra, penumbra, ambient] = layers;

  return { umbra: umbra!, penumbra: penumbra!, ambient: ambient! };
}

/** The element that draws the shadow: the shadow `.host`, or a host that is its box. */
function boxOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
}

function centerOf(element: HTMLElement): readonly [number, number] {
  const { left, top, width, height } = element.getBoundingClientRect();
  return [left + width / 2, top + height / 2];
}

/**
 * A shadow colour other than `md.sys.color.shadow`, which every component's
 * token and the elevation package's default resolve to. Set on a component's
 * own `--_container-shadow-color`, it tells the component's colour apart from
 * the elevation package's.
 */
const OWN_SHADOW_COLOR = 'rgb(255, 0, 0)';

afterEach(async () => {
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

describe('mx-button elevation layers', () => {
  it('should draw the three elevation layers of its resting level', async () => {
    const button = document.createElement('mx-button');
    button.setAttribute('color', 'elevated');
    button.textContent = 'Button';
    document.body.append(button);
    await nextFrame();
    const { values } = await commands.resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'default',
      tokens: ['container.elevation', 'container.shadow-color'],
    });

    expect(renderedLayers(boxOf(button))).toEqual(
      await expectedLayers(
        values['container.elevation']!,
        values['container.shadow-color']!,
      ),
    );
  });

  // The button adopts the elevation stylesheet after its own.
  it('should draw its layers in its own shadow colour, after the elevation stylesheet', async () => {
    const button = document.createElement('mx-button');
    button.setAttribute('color', 'elevated');
    button.textContent = 'Button';
    button.style.setProperty('--_container-shadow-color', OWN_SHADOW_COLOR);
    document.body.append(button);
    await nextFrame();
    const { values } = await commands.resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'default',
      tokens: ['container.elevation'],
    });

    expect(renderedLayers(boxOf(button))).toEqual(
      await expectedLayers(values['container.elevation']!, OWN_SHADOW_COLOR),
    );
  });
});

describe('mx-fab elevation layers', () => {
  it.each([
    { name: 'default', extended: null },
    { name: 'extended', extended: 'open' },
  ] as const)(
    'should draw the three elevation layers of its resting level ($name)',
    async ({ extended }) => {
      const fab = document.createElement('mx-fab');

      if (extended) {
        fab.setAttribute('extended', extended);
        fab.textContent = 'Compose';
      }

      document.body.append(fab);
      await nextFrame();
      const { values } = await commands.resolveTokenContract({
        contract: 'fab.color.default',
        state: 'default',
        tokens: ['elevation.default', 'container.shadow-color'],
      });

      expect(renderedLayers(boxOf(fab))).toEqual(
        await expectedLayers(
          values['elevation.default']!,
          values['container.shadow-color']!,
        ),
      );
    },
  );

  // The FAB adopts the elevation stylesheet before its own.
  it('should draw its layers in its own shadow colour, before the elevation stylesheet', async () => {
    const fab = document.createElement('mx-fab');
    fab.style.setProperty('--_container-shadow-color', OWN_SHADOW_COLOR);
    document.body.append(fab);
    await nextFrame();
    const { values } = await commands.resolveTokenContract({
      contract: 'fab.color.default',
      state: 'default',
      tokens: ['elevation.default'],
    });

    expect(renderedLayers(boxOf(fab))).toEqual(
      await expectedLayers(values['elevation.default']!, OWN_SHADOW_COLOR),
    );
  });
});

describe('mx-card elevation layers', () => {
  it('should draw the three elevation layers of its level', async () => {
    const card = createCard('elevated');
    document.body.append(card);
    await nextFrame();
    const { values } = await commands.resolveTokenContract({
      contract: 'card.elevated',
      state: 'default',
      tokens: ['container.elevation', 'container.shadow-color'],
    });

    expect(renderedLayers(boxOf(card))).toEqual(
      await expectedLayers(
        values['container.elevation']!,
        values['container.shadow-color']!,
      ),
    );
  });

  it('should draw its layers in its own shadow colour', async () => {
    const card = createCard('elevated');
    card.style.setProperty('--_container-shadow-color', OWN_SHADOW_COLOR);
    document.body.append(card);
    await nextFrame();
    const { values } = await commands.resolveTokenContract({
      contract: 'card.elevated',
      state: 'default',
      tokens: ['container.elevation'],
    });

    expect(renderedLayers(boxOf(card))).toEqual(
      await expectedLayers(values['container.elevation']!, OWN_SHADOW_COLOR),
    );
  });

  // A filled button sets no level, so it draws the level it inherits.
  it('should not raise a filled button inside an elevated card', async () => {
    const card = createCard('elevated');
    const button = document.createElement('mx-button');
    button.textContent = 'Button';
    card.append(button);
    document.body.append(card);
    await nextFrame();

    expect(layerAlphas(boxOf(button))).toEqual([0, 0, 0]);
  });
});

describe('host-box elevation layers', () => {
  it('should generate no pseudo-element box on mx-card', async () => {
    const card = createCard('elevated');
    document.body.append(card);
    await nextFrame();

    expect(pseudoContents(card)).toEqual(['none', 'none']);
  });

  it('should generate no pseudo-element box on a lifted mx-list-item', async () => {
    const [item] = createSortableList('mx-list-item');
    await nextFrame();
    await lift(item!);

    expect(pseudoContents(item!)).toEqual(['none', 'none']);
  });
});

/** The `content` of both pseudo-elements: one with `none` generates no box. */
function pseudoContents(element: Element): readonly string[] {
  return ['::before', '::after'].map(
    (pseudo) => getComputedStyle(element, pseudo).content,
  );
}

/** Drags `item` a little, and keeps the button down. */
async function lift(item: HTMLElement): Promise<void> {
  const [x, y] = centerOf(boxOf(item));
  await commands.pointerPress(x, y);
  await commands.pointerMove(x, y + 12, 3);
  await expect.poll(() => item.matches(':state(drag)')).toBe(true);
}

function createSortableList(tag: string): readonly HTMLElement[] {
  const list = document.createElement('mx-sortable-list');
  list.style.setProperty('--_drag-duration', '0s');
  const items = ['A', 'B'].map((label) => {
    const item = document.createElement(tag);
    item.textContent = label;
    return item;
  });
  list.append(...items);
  document.body.append(list);
  return items;
}

async function listShadowColor(): Promise<string | number> {
  const { values } = await commands.resolveTokenContract({
    contract: 'list-item.default',
    state: 'default',
    tokens: ['shadow.color'],
  });

  return values['shadow.color']!;
}

describe('mx-list items elevation layers', () => {
  it.each(['mx-list-item', 'mx-list-button-item'] as const)(
    'should draw the three elevation layers of the dragged level (%s)',
    async (tag) => {
      const [item] = createSortableList(tag);
      await nextFrame();
      await lift(item!);
      const { values } = await commands.resolveTokenContract({
        contract: 'list-item.default',
        state: 'dragged',
        tokens: ['container.elevation'],
      });

      expect(renderedLayers(boxOf(item!))).toEqual(
        await expectedLayers(
          values['container.elevation']!,
          await listShadowColor(),
        ),
      );
    },
  );

  // A pointer drag doesn't lift a link item in Chromium or Firefox, and at
  // level 0 every shadow colour serializes the same. So the row sets the level
  // the other items are read at, and no transition, on the item in `mx-list`.
  it('should draw the three elevation layers in its shadow colour at level 1 (mx-list-link-item)', async () => {
    const item = document.createElement('mx-list-link-item');
    item.setAttribute('href', '#');
    item.textContent = 'A';
    item.style.setProperty('--_level', '1');
    item.style.setProperty('transition', 'none');
    const list = document.createElement('mx-list');
    list.append(item);
    document.body.append(list);
    await nextFrame();

    expect(renderedLayers(boxOf(item))).toEqual(
      await expectedLayers(1, await listShadowColor()),
    );
  });
});

/** The alpha of a computed `box-shadow`'s colour, 0 for `none`. */
function shadowAlpha(shadow: string): number {
  if (shadow === 'none') {
    return 0;
  }

  // `rgb(r, g, b)`, `rgba(r, g, b, a)` or `color(srgb r g b / a)`.
  const channels = /(?:rgba?|color)\((?<channels>[^)]*)\)/u
    .exec(shadow)!
    .groups!['channels']!.match(/\d+(?:\.\d+)?(?:e-?\d+)?/gu)!;

  return channels.length > 3 ? Number(channels[3]) : 1;
}

/** The layers' alphas, as {@link shadowAlpha}. */
function layerAlphas(box: Element): readonly number[] {
  return Object.values(renderedLayers(box)).map(shadowAlpha);
}

const RESTING_CASES = [
  { name: 'mx-list-item', create: () => createResting('mx-list-item') },
  {
    name: 'mx-list-button-item',
    create: () => createResting('mx-list-button-item'),
  },
  {
    name: 'mx-list-link-item',
    create: () => createResting('mx-list-link-item'),
  },
  {
    name: 'filled mx-button',
    create: () => {
      const button = document.createElement('mx-button');
      button.textContent = 'Button';
      return button;
    },
  },
  { name: 'filled mx-card', create: () => createCard(null) },
  {
    name: 'outlined mx-card',
    create: () => {
      const card = createCard('outlined');
      // Two screenshots of an unchanged rounded outline can differ by 1 per
      // channel in Chromium, and the rows compare the layers.
      card.style.setProperty('--md-card-outline-color', 'transparent');
      return card;
    },
  },
] as const;

function createCard(variant: 'elevated' | 'outlined' | null): HTMLElement {
  const card = document.createElement('mx-card');
  card.variant = variant;
  card.textContent = 'Card';
  return card;
}

function createResting(tag: string): HTMLElement {
  const list = document.createElement('mx-list');
  const item = document.createElement(tag);
  item.setAttribute('href', '#');
  item.textContent = 'Item';
  list.append(item);
  return list;
}

/** The component in `fixture`: the fixture itself, or its list's item. */
function componentOf(fixture: HTMLElement): HTMLElement {
  return fixture.localName === 'mx-list'
    ? (fixture.firstElementChild! as HTMLElement)
    : fixture;
}

/** Mounts `fixture` in a padded frame, so a screenshot holds its shadow. */
async function mount(fixture: HTMLElement): Promise<HTMLElement> {
  const frame = document.createElement('div');
  frame.style.cssText =
    'display: inline-block; padding: 8px; background: white; inline-size: 240px;';
  frame.append(fixture);
  document.body.append(frame);
  await nextFrame();
  return frame;
}

describe('elevation at level 0', () => {
  it.each(RESTING_CASES)(
    'should draw each layer of $name transparent',
    async ({ create }) => {
      const fixture = create();
      await mount(fixture);

      expect(layerAlphas(boxOf(componentOf(fixture)))).toEqual([0, 0, 0]);
    },
  );

  it.each(RESTING_CASES)(
    'should paint $name as it does with no layers',
    async ({ create }) => {
      const fixture = create();
      const frame = await mount(fixture);
      const component = componentOf(fixture);
      const drawn = await page.screenshot({ element: frame, save: false });

      for (const layer of ['umbra', 'penumbra', 'ambient']) {
        component.style.setProperty(`--_elevation-${layer}`, 'none');
      }
      await nextFrame();

      const bare = await page.screenshot({ element: frame, save: false });

      // A boolean, because a failure would print both images in base64.
      expect(drawn === bare).toBe(true);
    },
  );

  it('should raise the layers continuously from level 0', async () => {
    const alphas = await Promise.all(
      [0.25, 0.5, 1].map(async (level) => {
        const fixture = createResting('mx-list-item');
        componentOf(fixture).style.setProperty('--_level', String(level));
        await mount(fixture);
        return shadowAlpha(
          renderedLayers(boxOf(componentOf(fixture))).penumbra,
        );
      }),
    );

    expect([alphas[0]! < alphas[1]!, alphas[1]! < alphas[2]!]).toEqual([
      true,
      true,
    ]);
  });
});
