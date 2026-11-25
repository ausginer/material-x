import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import '../../src/button/icon-button.ts';
import '../../src/icon/icon.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame, pixels, resolveComputed } from '../browser.ts';
import { coveredIndicator, focusFirst, TAB } from '../focus-indicator.ts';

const INTERACTIVE_ITEMS = ['mx-list-button-item', 'mx-list-link-item'] as const;

type InteractiveItem = (typeof INTERACTIVE_ITEMS)[number];

const CONTENT_SLOTS = [
  'lead',
  'overline',
  'label',
  'support',
  'trail',
] as const;

type CreateOptions = Readonly<{ selected?: boolean; disabled?: boolean }>;

/** An item with content in each of its slots. */
async function createItem(
  tag: InteractiveItem,
  { selected = false, disabled = false }: CreateOptions = {},
): Promise<HTMLElement> {
  const item = document.createElement(tag);

  for (const slot of CONTENT_SLOTS) {
    const content = document.createElement('span');

    if (slot !== 'label') {
      content.slot = slot;
    }

    content.textContent = slot;
    item.append(content);
  }

  item.toggleAttribute('selected', selected);
  item.toggleAttribute('disabled', disabled);
  document.body.append(item);
  await nextFrame();

  return item;
}

function getControl(item: HTMLElement): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('.host')!;
}

function getSlot(item: HTMLElement, name: string): HTMLSlotElement {
  return item.shadowRoot!.querySelector<HTMLSlotElement>(`slot.${name}`)!;
}

async function resolveTokens(
  state: string,
  tokens: readonly string[],
): Promise<Readonly<Record<string, string | number>>> {
  const { values } = await commands.resolveTokenContract({
    contract: 'list-item.default',
    state,
    tokens,
  });

  return values;
}

/**
 * A computed colour as 8-bit sRGB channels and an alpha, whichever of the
 * `rgb()` and `color(srgb …)` serializations the engine gives it.
 */
function srgb(computed: string): readonly number[] {
  const [red, green, blue, alpha = 1] = computed
    .match(/\d+(?:\.\d+)?(?:e-?\d+)?/gu)!
    .map(Number);
  const scale = computed.startsWith('color(srgb') ? 255 : 1;

  return [
    Math.round(red! * scale),
    Math.round(green! * scale),
    Math.round(blue! * scale),
    Math.round(alpha * 100) / 100,
  ];
}

/** The colour the token value resolves to in the document, as {@link srgb}. */
function expectedColor(token: string | number): readonly number[] {
  return srgb(resolveComputed('color', String(token)));
}

describe.each(INTERACTIVE_ITEMS)('%s selection colour contract', (tag) => {
  it('should render the unselected container colour', async () => {
    const values = await resolveTokens('default', ['container.color']);
    const item = await createItem(tag);

    expect(srgb(getComputedStyle(getControl(item)).backgroundColor)).toEqual(
      expectedColor(values['container.color']!),
    );
  });

  it('should render the unselected trailing icon colour', async () => {
    const values = await resolveTokens('unselected.default', [
      'trailing-icon.color',
    ]);
    const item = await createItem(tag);
    const icon = document.createElement('mx-icon');
    icon.slot = 'trail';
    item.append(icon);

    expect(srgb(getComputedStyle(icon).color)).toEqual(
      expectedColor(values['trailing-icon.color']!),
    );
  });

  it('should render the selected container colour', async () => {
    const values = await resolveTokens('selected.default', ['container.color']);
    const item = await createItem(tag, { selected: true });

    expect(srgb(getComputedStyle(getControl(item)).backgroundColor)).toEqual(
      expectedColor(values['container.color']!),
    );
  });

  it('should render the selected label colour', async () => {
    const values = await resolveTokens('selected.default', [
      'label-text.color',
    ]);
    const item = await createItem(tag, { selected: true });

    expect(srgb(getComputedStyle(getSlot(item, 'label')).color)).toEqual(
      expectedColor(values['label-text.color']!),
    );
  });

  it('should render the unselected colours again once selected is cleared', async () => {
    const [{ 'container.color': container }, { 'trailing-icon.color': icon }] =
      await Promise.all([
        resolveTokens('default', ['container.color']),
        resolveTokens('unselected.default', ['trailing-icon.color']),
      ]);
    const item = await createItem(tag, { selected: true });
    const trailing = document.createElement('mx-icon');
    trailing.slot = 'trail';
    item.append(trailing);

    item.toggleAttribute('selected', false);

    expect({
      container: srgb(getComputedStyle(getControl(item)).backgroundColor),
      icon: srgb(getComputedStyle(trailing).color),
    }).toEqual({
      container: expectedColor(container!),
      icon: expectedColor(icon!),
    });
  });
});

describe.each(INTERACTIVE_ITEMS)('%s disabled contract', (tag) => {
  it.each(CONTENT_SLOTS)(
    'should render the %s content at the disabled opacity',
    async (slot) => {
      const values = await resolveTokens('disabled', ['opacity']);
      const item = await createItem(tag, { disabled: true });

      expect(Number(getComputedStyle(getSlot(item, slot)).opacity)).toBe(
        Number(values['opacity']),
      );
    },
  );
});

describe.each(INTERACTIVE_ITEMS)('%s selected and disabled contract', (tag) => {
  it('should render the container colour at the container opacity', async () => {
    const values = await resolveTokens('selected.disabled', [
      'container.color',
      'container.opacity',
    ]);
    const item = await createItem(tag, { selected: true, disabled: true });
    const [red, green, blue] = expectedColor(values['container.color']!);

    expect(srgb(getComputedStyle(getControl(item)).backgroundColor)).toEqual([
      red,
      green,
      blue,
      Number(values['container.opacity']),
    ]);
  });

  it('should keep the container opacity off the content', async () => {
    const item = await createItem(tag, { selected: true, disabled: true });

    expect(Number(getComputedStyle(getControl(item)).opacity)).toBe(1);
  });

  it.each(CONTENT_SLOTS)(
    'should render the %s content at the disabled opacity',
    async (slot) => {
      const values = await resolveTokens('disabled', ['opacity']);
      const item = await createItem(tag, { selected: true, disabled: true });

      expect(Number(getComputedStyle(getSlot(item, slot)).opacity)).toBe(
        Number(values['opacity']),
      );
    },
  );
});

describe.each(INTERACTIVE_ITEMS)('%s press transition contract', (tag) => {
  it('should transition the container shape over the press duration and easing', async () => {
    const values = await resolveTokens('default', [
      'press.duration',
      'press.easing',
    ]);
    const style = getComputedStyle(getControl(await createItem(tag)));

    expect({
      property: style.transitionProperty,
      duration: style.transitionDuration,
      easing: style.transitionTimingFunction,
    }).toEqual({
      property: 'border-radius',
      duration: resolveComputed(
        'transition-duration',
        String(values['press.duration']),
      ),
      easing: resolveComputed(
        'transition-timing-function',
        String(values['press.easing']),
      ),
    });
  });
});

const TEXTS = [
  { name: 'label', slot: 'label', token: 'label-text.tracking' },
  { name: 'overline', slot: 'overline', token: 'overline.tracking' },
  {
    name: 'supporting text',
    slot: 'support',
    token: 'supporting-text.tracking',
  },
  {
    name: 'trailing text',
    slot: 'trail',
    token: 'trailing-supporting-text.tracking',
  },
  {
    name: 'avatar label',
    slot: 'lead',
    token: 'leading-avatar-label.tracking',
  },
] as const;

describe.each(INTERACTIVE_ITEMS)('%s tracking contract', (tag) => {
  it.each(TEXTS)(
    'should render the $name at its tracking',
    async ({ slot, token }) => {
      const values = await resolveTokens('default', [token]);
      const item = await createItem(tag);
      item.querySelector('[slot="lead"]')!.toggleAttribute('data-avatar', true);
      const [text] = getSlot(item, slot).assignedElements();

      expect(getComputedStyle(text!).letterSpacing).toBe(
        resolveComputed('letter-spacing', String(values[token])),
      );
    },
  );
});

const LISTS = ['mx-list', 'mx-sortable-list'] as const;

const ITEMS = ['mx-list-item', ...INTERACTIVE_ITEMS] as const;

/** A list of one item of each tag, whose first item has keyboard focus. */
async function createFocusedList(
  list: (typeof LISTS)[number],
  tags: ReadonlyArray<(typeof ITEMS)[number]>,
): Promise<
  Readonly<{
    frame: HTMLElement;
    /** The element that draws the first item's indicator. */
    box: HTMLElement;
    next: HTMLElement;
  }>
> {
  const frame = document.createElement('div');
  frame.style.cssText = 'padding: 12px; background: white; inline-size: 300px;';
  const element = document.createElement(list);
  const items = tags.map((tag) => {
    const item = document.createElement(tag);
    item.textContent = tag;

    if (tag === 'mx-list-link-item') {
      item.setAttribute('href', '#link');
    }

    return item;
  });

  // A static item in `mx-list` is a tab stop when the consumer makes it one.
  if (tags[0] === 'mx-list-item') {
    items[0]!.tabIndex = 0;
  }

  element.append(...items);
  frame.append(element);
  document.body.append(frame);
  await nextFrame();
  await focusFirst(frame);

  const [first, next] = items;
  const box = first!.shadowRoot!.querySelector<HTMLElement>('.host') ?? first!;
  expect(box.matches(':focus-visible')).toBe(true);

  return { frame, box, next: next! };
}

describe.each(ITEMS)('%s focus indicator contract', (tag) => {
  it.each([
    ['thickness', 'focus.indicator.thickness', 'outline-width'],
    ['offset', 'focus.indicator.outline.offset', 'outline-offset'],
    ['colour', 'focus.indicator.color', 'outline-color'],
  ])('should render the indicator %s', async (_, token, property) => {
    const values = await resolveTokens('default', [token]);
    const { box } = await createFocusedList('mx-list', [tag]);

    const expected = String(values[token]!);

    expect(getComputedStyle(box).getPropertyValue(property)).toBe(
      property === 'outline-color'
        ? resolveComputed(property, expected)
        : `${pixels(expected)}px`,
    );
  });
});

/** The element that draws the focus indicator of `control`. */
function indicatorBoxOf(control: HTMLElement): HTMLElement {
  return control.shadowRoot?.querySelector<HTMLElement>('button') ?? control;
}

/** Moves keyboard focus through `frame` to `control`. */
async function focusControl(
  frame: HTMLElement,
  control: HTMLElement,
): Promise<void> {
  await focusFirst(frame);

  // An interactive item's own control comes before the handle.
  if (document.activeElement !== control) {
    await userEvent.keyboard(TAB);
  }

  expect(document.activeElement).toBe(control);
  expect(indicatorBoxOf(control).matches(':focus-visible')).toBe(true);
}

const CONTROL_SLOTS = ['lead', 'trail'] as const;

type ControlSlot = (typeof CONTROL_SLOTS)[number];

/** An item with `control` in `slot`, in a framed list. */
async function createListWithControl(
  list: (typeof LISTS)[number],
  tag: (typeof ITEMS)[number],
  control: HTMLElement,
  slot: ControlSlot | 'overline' | 'support' | '',
): Promise<HTMLElement> {
  const frame = document.createElement('div');
  frame.style.cssText = 'padding: 12px; background: white; inline-size: 300px;';
  const element = document.createElement(list);
  const item = document.createElement(tag);
  item.textContent = tag;

  if (tag === 'mx-list-link-item') {
    item.setAttribute('href', '#link');
  }

  control.slot = slot;
  item.append(control);
  element.append(item);
  frame.append(element);
  document.body.append(frame);
  await nextFrame();

  return frame;
}

function createHandle(tag: string): HTMLElement {
  const handle = document.createElement(tag);
  handle.className = 'handle';
  handle.toggleAttribute('data-handle', true);
  handle.textContent = 'drag_handle';

  return handle;
}

const HANDLES = ['mx-icon', 'span', 'button'] as const;
const SORTABLE_ITEMS = ['mx-list-item', 'mx-list-button-item'] as const;

describe.each(SORTABLE_ITEMS)('handle focus indicator in %s', (tag) => {
  describe.each(CONTROL_SLOTS)('in the %s slot', (slot) => {
    describe.each(HANDLES)('of %s', (handleTag) => {
      it.each([
        ['thickness', 'focus.indicator.thickness', 'outline-width'],
        ['offset', 'focus.indicator.outline.offset', 'outline-offset'],
        ['colour', 'focus.indicator.color', 'outline-color'],
      ])('should render the indicator %s', async (_, token, property) => {
        const { values } = await commands.resolveTokenContract({
          contract: 'focus.default',
          state: 'default',
          tokens: [token],
        });
        const handle = createHandle(handleTag);

        await focusControl(
          await createListWithControl('mx-sortable-list', tag, handle, slot),
          handle,
        );

        const expected = String(values[token]!);

        expect(getComputedStyle(handle).getPropertyValue(property)).toBe(
          property === 'outline-color'
            ? resolveComputed(property, expected)
            : `${pixels(expected)}px`,
        );
      });
    });

    it("should leave the outline to a page's own rule on the handle", async () => {
      const handle = createHandle('mx-icon');
      const frame = await createListWithControl(
        'mx-sortable-list',
        tag,
        handle,
        slot,
      );
      const sheet = document.createElement('style');
      sheet.textContent = `.handle:focus-visible {
        outline: 5px dotted rgb(1, 2, 3);
        outline-offset: 7px;
      }`;
      frame.append(sheet);

      await focusControl(frame, handle);
      const { outlineWidth, outlineStyle, outlineColor, outlineOffset } =
        getComputedStyle(handle);

      expect({
        outlineWidth,
        outlineStyle,
        outlineColor,
        outlineOffset,
      }).toEqual({
        outlineWidth: '5px',
        outlineStyle: 'dotted',
        outlineColor: 'rgb(1, 2, 3)',
        outlineOffset: '7px',
      });
    });
  });
});

describe('handle focus indicator conditions', () => {
  describe.each(CONTROL_SLOTS)('in the %s slot', (slot) => {
    it('should draw a solid outline with keyboard focus alone', async () => {
      const handle = createHandle('mx-icon');
      const frame = await createListWithControl(
        'mx-sortable-list',
        'mx-list-item',
        handle,
        slot,
      );
      const before = getComputedStyle(handle).outlineStyle;

      await focusControl(frame, handle);

      expect([before, getComputedStyle(handle).outlineStyle]).toEqual([
        'none',
        'solid',
      ]);
    });

    it('should draw no outline after a mouse click', async () => {
      const handle = createHandle('mx-icon');
      await createListWithControl(
        'mx-sortable-list',
        'mx-list-item',
        handle,
        slot,
      );

      await userEvent.click(handle);

      expect(document.activeElement).toBe(handle);
      expect(getComputedStyle(handle).outlineStyle).toBe('none');
    });

    it('should leave a focusable child without data-handle alone', async () => {
      const child = document.createElement('span');
      child.tabIndex = 0;
      child.textContent = 'child';

      await focusControl(
        await createListWithControl('mx-list', 'mx-list-item', child, slot),
        child,
      );

      expect(getComputedStyle(child).outlineStyle).not.toBe('solid');
    });
  });

  it.each([
    ['label', ''],
    ['overline', 'overline'],
    ['support', 'support'],
  ] as const)(
    'should leave a focusable data-handle in the %s slot alone',
    async (_, slot) => {
      const handle = createHandle('span');
      handle.tabIndex = 0;

      await focusControl(
        await createListWithControl(
          'mx-sortable-list',
          'mx-list-item',
          handle,
          slot,
        ),
        handle,
      );

      expect(getComputedStyle(handle).outlineStyle).not.toBe('solid');
    },
  );
});

type ControlCase = Readonly<{
  name: string;
  list: (typeof LISTS)[number];
  tag: (typeof ITEMS)[number];
  create: () => HTMLElement;
}>;

function createIconButton(): HTMLElement {
  const button = document.createElement('mx-icon-button');
  const icon = document.createElement('mx-icon');
  icon.textContent = 'more_vert';
  button.append(icon);

  return button;
}

const CONTROL_CASES: readonly ControlCase[] = [
  ...ITEMS.map((tag): ControlCase => ({
    name: `mx-icon-button in ${tag}`,
    list: 'mx-list',
    tag,
    create: createIconButton,
  })),
  {
    name: 'mx-icon handle in mx-list-item of a sortable list',
    list: 'mx-sortable-list',
    tag: 'mx-list-item',
    create: () => createHandle('mx-icon'),
  },
];

describe.each(CONTROL_CASES)(
  'whole focus indicator of $name',
  ({ list, tag, create }) => {
    it.each(['left', 'right', 'bottom'] as const)(
      'should paint its %s edge in the trail slot as in the lead slot',
      async (side) => {
        const read = async (slot: ControlSlot) => {
          const control = create();
          const frame = await createListWithControl(list, tag, control, slot);
          await focusControl(frame, control);
          const box = indicatorBoxOf(control);
          const { painted } = await coveredIndicator(frame, { box, side }, []);
          const { height } = box.getBoundingClientRect();
          frame.remove();

          return { painted, height };
        };

        const lead = await read('lead');
        const trail = await read('trail');

        // The row reads a whole edge, and not a few pixels.
        expect(lead.painted).toBeGreaterThan(lead.height);
        expect(trail.painted).toBeGreaterThanOrEqual(0.9 * lead.painted);
      },
    );
  },
);

describe.each(LISTS)('%s focus indicator stacking', (list) => {
  describe.each(ITEMS)('of %s', (tag) => {
    it.each(ITEMS)(
      'should not be covered by the next item, %s',
      async (nextTag) => {
        const { frame, box, next } = await createFocusedList(list, [
          tag,
          nextTag,
        ]);

        const { painted, covered } = await coveredIndicator(
          frame,
          { box, side: 'bottom' },
          [next],
        );

        expect(covered).toBe(0);
        // The row reads a whole edge, and not a few pixels.
        expect(painted).toBeGreaterThan(box.getBoundingClientRect().width);
      },
    );
  });
});
