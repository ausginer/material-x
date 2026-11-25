import { afterEach, describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame, resolveComputed, srgb } from '../browser.ts';

type ItemTag = 'mx-list-item' | 'mx-list-button-item' | 'mx-list-link-item';

type ItemOptions = Readonly<{
  tag: ItemTag;
  handle?: boolean;
  selected?: boolean;
  disabled?: boolean;
}>;

type Values = Readonly<Record<string, string | number>>;

const LIFTED_ITEMS: ReadonlyArray<readonly [string, ItemOptions]> = [
  ['a static item', { tag: 'mx-list-item' }],
  ['a static item by its handle', { tag: 'mx-list-item', handle: true }],
  ['a button item', { tag: 'mx-list-button-item' }],
  ['a button item by its handle', { tag: 'mx-list-button-item', handle: true }],
  ['a selected button item', { tag: 'mx-list-button-item', selected: true }],
  // A pointer drag doesn't lift a link item in Firefox.
  ...(server.browser === 'firefox'
    ? []
    : ([
        [
          'a link item by its handle',
          { tag: 'mx-list-link-item', handle: true },
        ],
        [
          'a selected link item by its handle',
          { tag: 'mx-list-link-item', handle: true, selected: true },
        ],
      ] as const)),
];

/** The tokens that color the item's content, with the slot each one colors. */
const CONTENT_COLORS = [
  ['label-text.color', '.label'],
  ['overline.color', '.overline'],
  ['supporting-text.color', '.support'],
  ['leading-icon.color', '[data-part=lead]'],
  ['trailing-icon.color', '[data-part=trail]'],
  ['trailing-supporting-text.color', '[data-part=text]'],
] as const;

const CONTENT_TOKENS = CONTENT_COLORS.map(([token]) => token);

async function resolveReorder(
  state: string,
  tokens: readonly string[],
): Promise<Values> {
  const { values } = await commands.resolveTokenContract({
    contract: 'list.reorder',
    state,
    tokens,
  });
  return values;
}

function createPart(slot: string, part: string, icon: boolean): HTMLElement {
  const element = document.createElement('span');
  element.slot = slot;
  element.dataset['part'] = part;
  element.toggleAttribute('data-icon', icon);
  element.textContent = part;
  return element;
}

/** A sortable list whose first item has content in each of its slots. */
async function createList({
  tag,
  handle = false,
  selected = false,
  disabled = false,
}: ItemOptions): Promise<readonly [HTMLElement, HTMLElement]> {
  const list = document.createElement('mx-sortable-list');
  list.style.setProperty('--_drag-duration', '0s');
  const item = document.createElement(tag);
  const lead = createPart('lead', 'lead', true);
  lead.toggleAttribute('data-handle', handle);
  item.append(
    lead,
    createPart('overline', 'overline', false),
    'Label',
    createPart('support', 'support', false),
    createPart('trail', 'trail', true),
    createPart('trail', 'text', false),
  );
  item.toggleAttribute('selected', selected);
  item.toggleAttribute('disabled', disabled);
  if (tag === 'mx-list-link-item') {
    item.setAttribute('href', '#target');
  }
  list.append(item, document.createElement('mx-list-item'));
  document.body.append(list);
  await nextFrame();
  return [list, item];
}

/** The item's container: an interactive item's control, or a static item's host. */
function containerOf(item: HTMLElement): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('.host') ?? item;
}

function partOf(item: HTMLElement, selector: string): Element {
  return (selector.startsWith('.') ? item.shadowRoot! : item).querySelector(
    selector,
  )!;
}

/** The colors that the item paints: its container's, and its content's. */
function paintedColors(item: HTMLElement): Record<string, readonly number[]> {
  return {
    'container.color': srgb(
      getComputedStyle(containerOf(item)).backgroundColor,
    ),
    ...Object.fromEntries(
      CONTENT_COLORS.map(([token, selector]) => [
        token,
        srgb(getComputedStyle(partOf(item, selector)).color),
      ]),
    ),
  };
}

/** Hovers the item's handle, or its label, and lifts it from there. */
async function lift(item: HTMLElement): Promise<void> {
  const target = item.querySelector('[data-handle]') ?? partOf(item, '.label');
  const { left, top, width, height } = target.getBoundingClientRect();
  const [x, y] = [left + width / 2, top + height / 2];
  await commands.pointerMove(x, y, 1);
  await commands.pointerPress(x, y);
  await commands.pointerMove(x, y + 12, 3);
  expect(item.matches(':state(drag):popover-open')).toBe(true);
}

afterEach(async () => {
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

describe('mx-sortable-list reorder contract', () => {
  describe.each(LIFTED_ITEMS)('of %s in a pointer drag', (_, options) => {
    it('should render the container and content colors at once', async () => {
      const values = await resolveReorder('lifted', [
        'container.color',
        ...CONTENT_TOKENS,
      ]);
      const [, item] = await createList(options);

      await lift(item);

      expect(paintedColors(item)).toEqual(
        Object.fromEntries(
          Object.entries(values).map(([token, value]) => [
            token,
            srgb(resolveComputed('color', String(value))),
          ]),
        ),
      );
    });

    it('should render the shape', async () => {
      const values = await resolveReorder('lifted', [
        'container.expressive.shape',
      ]);
      const [, item] = await createList(options);

      await lift(item);

      await expect
        .poll(() => getComputedStyle(containerOf(item)).borderTopLeftRadius)
        .toBe(values['container.expressive.shape']);
    });

    it('should render the resting colors again after the drop', async () => {
      const [, item] = await createList(options);
      const rest = paintedColors(item);

      await lift(item);
      await commands.pointerRelease();
      await expect.poll(() => item.matches(':popover-open')).toBe(false);

      expect(paintedColors(item)).toEqual(rest);
    });
  });

  it.each(LIFTED_ITEMS.filter(([, { tag }]) => tag !== 'mx-list-item'))(
    'should render the state layer on %s in a pointer drag',
    async (_, options) => {
      const values = await resolveReorder('lifted', [
        'state-layer.color',
        'state-layer.opacity',
      ]);
      const [, item] = await createList(options);

      await lift(item);

      // The press wave.
      const wave = getComputedStyle(partOf(item, '.ripple'), '::after');
      expect([srgb(wave.backgroundColor), Number(wave.opacity)]).toEqual([
        srgb(resolveComputed('color', String(values['state-layer.color']))),
        Number(values['state-layer.opacity']),
      ]);
    },
  );

  it('should render the drop zone in its color, opaque', async () => {
    const values = await resolveReorder('default', ['drop-zone.color']);
    const [list, item] = await createList({ tag: 'mx-list-item' });

    await lift(item);

    const zone = getComputedStyle(
      list.querySelector('[data-drag-placeholder]')!,
    );
    expect([srgb(zone.backgroundColor), zone.opacity]).toEqual([
      srgb(resolveComputed('color', String(values['drop-zone.color']))),
      '1',
    ]);
  });

  it('should keep the look of a disabled button item lifted by its handle', async () => {
    const [, item] = await createList({
      tag: 'mx-list-button-item',
      handle: true,
      disabled: true,
    });
    const read = () => ({
      ...paintedColors(item),
      shape: getComputedStyle(containerOf(item)).borderTopLeftRadius,
      opacity: getComputedStyle(partOf(item, '.label')).opacity,
    });
    const rest = read();

    await lift(item);

    expect(read()).toEqual(rest);
  });

  it.each(LIFTED_ITEMS)(
    "should keep the consumer's container color and shape on %s",
    async (_, options) => {
      const [, item] = await createList(options);
      item.style.setProperty('--md-list-item-container-color', 'rgb(9, 9, 9)');
      item.style.setProperty('--md-list-item-container-shape', '33px');
      await nextFrame();

      await lift(item);

      const style = getComputedStyle(containerOf(item));
      await expect
        .poll(() => [srgb(style.backgroundColor), style.borderTopLeftRadius])
        .toEqual([[9, 9, 9, 1], '33px']);
    },
  );

  it("should keep the consumer's list shape on the drop zone", async () => {
    const [list, item] = await createList({ tag: 'mx-list-item' });
    list.style.setProperty('--md-list-container-shape', '33px');

    await lift(item);

    expect(
      getComputedStyle(list.querySelector('[data-drag-placeholder]')!)
        .borderTopLeftRadius,
    ).toBe('33px');
  });
});
