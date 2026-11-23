import { describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-link-item.ts';
import { nextFrame, resolveComputed } from '../browser.ts';

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
