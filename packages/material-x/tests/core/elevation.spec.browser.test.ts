import { afterEach, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/button/button.ts';
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
 * The shadows the elevation tokens give to `box` at `level`, as the browser
 * serializes them. Each layer token is a `box-shadow` over `--_level` and
 * `--_shadow-color`, so a probe in the document resolves it under the
 * fixture's theme. tproc ends each layer with `;`, which a declaration value
 * can't hold.
 *
 * The shadow colour is the one `box` resolves, because the layers are under
 * test and the colour isn't: a component may give its own.
 */
async function expectedLayers(
  box: Element,
  level: string | number,
): Promise<ElevationLayers> {
  const { values } = await commands.resolveTokenContract({
    contract: 'elevation',
    state: 'default',
    tokens: LAYER_TOKENS,
  });
  const color = getComputedStyle(box).getPropertyValue('--_shadow-color');

  const resolve = (token: (typeof LAYER_TOKENS)[number]): string => {
    const probe = document.createElement('div');
    probe.style.setProperty('--_level', String(level));
    probe.style.setProperty('--_shadow-color', color);
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

/** The three shadows `box` draws: its own, and its `::before` and `::after`. */
function renderedLayers(box: Element): ElevationLayers {
  return {
    penumbra: getComputedStyle(box).boxShadow,
    umbra: getComputedStyle(box, '::before').boxShadow,
    ambient: getComputedStyle(box, '::after').boxShadow,
  };
}

/** The element that draws the shadow: the shadow `.host`, or a static item's host. */
function boxOf(element: HTMLElement): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>('.host') ?? element;
}

function centerOf(element: HTMLElement): readonly [number, number] {
  const { left, top, width, height } = element.getBoundingClientRect();
  return [left + width / 2, top + height / 2];
}

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
      tokens: ['container.elevation'],
    });

    expect(renderedLayers(boxOf(button))).toEqual(
      await expectedLayers(boxOf(button), values['container.elevation']!),
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
        tokens: ['elevation.default'],
      });

      expect(renderedLayers(boxOf(fab))).toEqual(
        await expectedLayers(boxOf(fab), values['elevation.default']!),
      );
    },
  );
});

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

describe('mx-list items elevation layers', () => {
  it.each(['mx-list-item', 'mx-list-button-item'] as const)(
    'should draw the three elevation layers of the dragged level (%s)',
    async (tag) => {
      const [item] = createSortableList(tag);
      await nextFrame();
      const box = boxOf(item!);
      const [x, y] = centerOf(box);
      await commands.pointerPress(x, y);
      await commands.pointerMove(x, y + 12, 3);
      await expect.poll(() => item!.matches(':state(drag)')).toBe(true);
      const { values } = await commands.resolveTokenContract({
        contract: 'list-item.default',
        state: 'dragged',
        tokens: ['container.elevation'],
      });

      expect(renderedLayers(box)).toEqual(
        await expectedLayers(box, values['container.elevation']!),
      );
    },
  );

  // A link item shares the button item's box stylesheet. It is read at rest,
  // because a pointer drag doesn't lift it.
  it('should draw the three elevation layers of the resting level (mx-list-link-item)', async () => {
    const item = document.createElement('mx-list-link-item');
    item.setAttribute('href', '#');
    item.textContent = 'A';
    const list = document.createElement('mx-list');
    list.append(item);
    document.body.append(list);
    await nextFrame();
    const box = boxOf(item);
    const { values } = await commands.resolveTokenContract({
      contract: 'list-item.default',
      state: 'default',
      tokens: ['container.elevation'],
    });

    expect(renderedLayers(box)).toEqual(
      await expectedLayers(box, values['container.elevation']!),
    );
  });
});
