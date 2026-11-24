import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../../src/button-group/connected-button-group.ts';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/split-button.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import { nextFrame } from '../browser.ts';
import {
  coveredIndicator,
  type Edge,
  focusFirst,
  TAB,
} from '../focus-indicator.ts';

const BUTTONS = [
  'mx-button',
  'mx-link-button',
  'mx-icon-button',
  'mx-switch-button',
  'mx-switch-icon-button',
] as const;

type ButtonTag = (typeof BUTTONS)[number];

type Fixture = Readonly<{
  /** The positioned element that holds the group and the page around it. */
  frame: HTMLElement;
  /** The element that the page has in `frame`. */
  root: HTMLElement;
  /** The connected group, which a split button has in its shadow tree. */
  group: HTMLElement;
  members: readonly HTMLElement[];
}>;

function boxOf(member: Element): HTMLElement {
  return member.shadowRoot!.querySelector<HTMLElement>('.host')!;
}

async function mount(root: HTMLElement): Promise<Fixture> {
  const frame = document.createElement('div');
  frame.style.cssText =
    'position: relative; padding: 12px; background: white; inline-size: fit-content;';
  frame.append(root);
  document.body.append(frame);
  await nextFrame();

  const group =
    root.shadowRoot!.querySelector<HTMLElement>('mx-connected-button-group') ??
    root;
  const members = Array.from(group.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  return { frame, root, group, members };
}

async function createGroup(tag: ButtonTag = 'mx-button'): Promise<Fixture> {
  const group = document.createElement('mx-connected-button-group');
  group.setAttribute('color', 'tonal');

  for (const value of ['one', 'two', 'three']) {
    const button = document.createElement(tag);
    button.setAttribute('value', value);
    // A wider content stretches an icon button to a fractional width, whose
    // antialiased corner pixels differ with the color behind them.
    button.textContent = tag.includes('icon') ? 'i' : value;

    if (tag === 'mx-link-button') {
      button.setAttribute('href', '#link');
    }

    group.append(button);
  }

  return await mount(group);
}

async function createSplitButton(): Promise<Fixture> {
  const split = document.createElement('mx-split-button');
  split.setAttribute('color', 'tonal');
  split.textContent = 'Save';

  return await mount(split);
}

/** Moves keyboard focus to the member at `index`, in the group's order. */
async function focusMember(
  { frame, members }: Fixture,
  index: number,
): Promise<HTMLElement> {
  // A switch button is one of a roving tab stop's items.
  const key = members[0]!.localName.startsWith('mx-switch')
    ? '{ArrowRight}'
    : TAB;
  await focusFirst(frame);

  for (let step = 0; step < index; step += 1) {
    await userEvent.keyboard(key);
  }

  const box = boxOf(members[index]!);
  expect(box.matches(':focus-visible')).toBe(true);

  return box;
}

async function click(box: Element): Promise<void> {
  await userEvent.click(page.elementLocator(box));
}

/** Clicks a member, and checks that it has focus, but not the keyboard's. */
async function clickMember(member: HTMLElement): Promise<void> {
  const box = boxOf(member);
  await click(box);
  expect(box.matches(':focus')).toBe(true);
  expect(box.matches(':focus-visible')).toBe(false);
}

function appendElement(
  parent: Element,
  cssText: string,
  tag: 'button' | 'div' | 'span' = 'div',
): HTMLElement {
  const element = document.createElement(tag);
  element.style.cssText = cssText;
  parent.append(element);

  return element;
}

function topElementAt(target: Element): Element | null {
  const { left, top, width, height } = target.getBoundingClientRect();

  return document.elementFromPoint(left + width / 2, top + height / 2);
}

const CONTAINERS: ReadonlyArray<
  Readonly<{ name: string; create: () => Promise<Fixture> }>
> = [
  { name: 'mx-connected-button-group', create: createGroup },
  { name: 'mx-split-button', create: createSplitButton },
];

describe('focus indicator in a connected group', () => {
  async function expectWholeEdge(
    fixture: Fixture,
    index: number,
    side: Edge['side'],
  ): Promise<void> {
    const box = await focusMember(fixture, index);

    const { painted, covered } = await coveredIndicator(
      fixture.frame,
      { box, side },
      fixture.members.filter((_, other) => other !== index),
    );

    expect(covered).toBe(0);
    // The row reads a whole edge, and not a few pixels.
    expect(painted).toBeGreaterThan(box.getBoundingClientRect().height);
  }

  describe.each(BUTTONS)('of %s', (tag) => {
    it.each([
      { position: 'first', index: 0, side: 'right' },
      { position: 'middle', index: 1, side: 'right' },
      { position: 'last', index: 2, side: 'left' },
    ] as const)(
      'should not be covered on the $side of the $position button',
      async ({ index, side }) => {
        await expectWholeEdge(await createGroup(tag), index, side);
      },
    );
  });

  describe('of mx-split-button', () => {
    it.each([
      { position: 'leading', index: 0, side: 'right' },
      { position: 'trailing', index: 1, side: 'left' },
    ] as const)(
      'should not be covered on the $side of the $position button',
      async ({ index, side }) => {
        await expectWholeEdge(await createSplitButton(), index, side);
      },
    );
  });
});

describe('page around a connected group without keyboard focus', () => {
  /** Each puts an element in the page and returns it. */
  const PAGES: ReadonlyArray<
    Readonly<{ what: string; add: (fixture: Fixture) => HTMLElement }>
  > = [
    {
      what: 'tooltip over later content',
      add({ frame, root }) {
        const content = root.localName === 'mx-split-button' ? root : null;
        const tooltip = appendElement(
          content ?? root.firstElementChild!,
          'position: absolute; z-index: 10; top: 100%; left: 0; margin-top: 8px; width: 40px; height: 20px;',
          'span',
        );
        appendElement(frame, 'position: relative; height: 60px;');

        return tooltip;
      },
    },
    {
      what: 'button over the empty end',
      add({ frame, root, group }) {
        frame.style.inlineSize = '380px';
        const button = appendElement(
          frame,
          'position: absolute; right: 12px; top: 16px; width: 24px; height: 24px;',
          'button',
        );
        root.before(button);
        // The group's box reaches under the button, past its members.
        expect(button.getBoundingClientRect().left).toBeLessThan(
          group.getBoundingClientRect().right,
        );

        return button;
      },
    },
  ];

  describe.each(CONTAINERS)('of $name', ({ create }) => {
    it.each(PAGES)('should keep the $what on top at rest', async ({ add }) => {
      const element = add(await create());

      expect(topElementAt(element)).toBe(element);
    });

    it.each(PAGES)(
      "should keep the $what on top with a pointer's focus",
      async ({ add }) => {
        const fixture = await create();
        const element = add(fixture);
        await clickMember(fixture.members[1]!);

        expect(topElementAt(element)).toBe(element);
      },
    );

    it.each(PAGES)(
      'should keep the $what on top after keyboard focus leaves',
      async ({ add }) => {
        const fixture = await create();
        const element = add(fixture);
        const outside = appendElement(document.body, '', 'button');
        // The page's button is a tab stop before the group.
        element.tabIndex = -1;
        await focusMember(fixture, 0);
        outside.focus();
        await nextFrame();

        expect(topElementAt(element)).toBe(element);
      },
    );
  });
});

describe('button with keyboard focus in the page', () => {
  const COVERS = [
    { what: 'a menu that follows', zIndex: 'auto', place: 'append' },
    {
      what: 'a bar with a z-index that precedes',
      zIndex: '1',
      place: 'prepend',
    },
  ] as const;

  describe.each(CONTAINERS)('of $name', ({ create }) => {
    it.each(COVERS)(
      'should stay below $what the group',
      async ({ zIndex, place }) => {
        const fixture = await create();
        const cover = document.createElement('div');
        cover.style.cssText = `position: absolute; inset: 0; z-index: ${zIndex};`;
        fixture.frame[place](cover);
        const box = await focusMember(fixture, 0);

        expect(topElementAt(box)).toBe(cover);
      },
    );
  });

  it('should stay below a positioned element that follows it alone', async () => {
    const button = document.createElement('mx-button');
    button.textContent = 'Button';
    const frame = document.createElement('div');
    frame.style.cssText = 'position: relative; inline-size: fit-content;';
    frame.append(button);
    document.body.append(frame);
    const cover = appendElement(frame, 'position: absolute; inset: 0;');
    await focusFirst(frame);
    const box = boxOf(button);

    expect(box.matches(':focus-visible')).toBe(true);
    expect(topElementAt(box)).toBe(cover);
  });
});

describe("focused mx-button in a group that isn't the group's member", () => {
  type Place = Readonly<{
    where: string;
    /** Returns the element that holds the button. */
    create: (fixture: Fixture) => HTMLElement;
  }>;

  function showPopover(parent: Element): HTMLElement {
    const popover = appendElement(parent, '');
    popover.popover = 'manual';
    popover.showPopover();

    return popover;
  }

  const PLACES: readonly Place[] = [
    {
      where: 'in a popover of a member',
      create: ({ members }) => showPopover(members[0]!),
    },
    {
      where: 'in a popover beside the members',
      create: ({ group }) => showPopover(group),
    },
    {
      where: 'in a wrapper',
      create: ({ group }) => appendElement(group, '', 'span'),
    },
  ];

  async function focusNested({
    create,
  }: Place): Promise<
    Readonly<{ group: HTMLElement; overlay: HTMLElement; box: HTMLElement }>
  > {
    const fixture = await createGroup();
    const content = appendElement(create(fixture), 'position: relative;');
    const nested = document.createElement('mx-button');
    nested.textContent = 'Nested';
    content.append(nested);
    const overlay = appendElement(content, 'position: absolute; inset: 0;');
    await focusFirst(fixture.frame);
    const box = boxOf(nested);

    for (let step = 0; step < 4 && !box.matches(':focus'); step += 1) {
      await userEvent.keyboard(TAB);
    }

    expect(box.matches(':focus-visible')).toBe(true);

    return { group: fixture.group, overlay, box };
  }

  it.each(PLACES)(
    'should stay below an overlay that follows it $where',
    async (place) => {
      const { overlay, box } = await focusNested(place);

      expect(topElementAt(box)).toBe(overlay);
    },
  );

  it.each(PLACES)(
    'should not make the group a stacking context $where',
    async (place) => {
      const { group } = await focusNested(place);

      expect(getComputedStyle(group).isolation).toBe('auto');
    },
  );
});

describe('connected group stacking context', () => {
  /**
   * Expects the group to be isolated exactly when one of its members has
   * keyboard focus, and that member alone to be raised.
   */
  function expectRaise({ group, members }: Fixture): void {
    const boxes = members.map(boxOf);
    const focused = boxes.map((box) => box.matches(':focus-visible'));

    expect({
      isolation: getComputedStyle(group).isolation,
      zIndexes: boxes.map((box) => getComputedStyle(box).zIndex),
    }).toEqual({
      isolation: focused.includes(true) ? 'isolate' : 'auto',
      zIndexes: focused.map((isFocused) => (isFocused ? '1' : 'auto')),
    });
  }

  it('should exist after Tab', async () => {
    const fixture = await createGroup();
    await focusMember(fixture, 0);

    expectRaise(fixture);
  });

  it('should not exist after a click', async () => {
    const fixture = await createGroup();
    await clickMember(fixture.members[0]!);

    expectRaise(fixture);
  });

  // Whether the letter makes the control match `:focus-visible` is the
  // engine's. The group follows it either way.
  it('should follow the focused control after a click and a letter', async () => {
    const fixture = await createGroup();
    await clickMember(fixture.members[0]!);
    await userEvent.keyboard('a');

    expectRaise(fixture);
  });

  it('should exist after a click on a switch button and an arrow', async () => {
    const fixture = await createGroup('mx-switch-button');
    const [first, second] = fixture.members;
    await clickMember(second!);
    await userEvent.keyboard('{ArrowLeft}');

    expect(boxOf(first!).matches(':focus-visible')).toBe(true);
    expectRaise(fixture);
  });

  it('should not exist after a click outside', async () => {
    const fixture = await createGroup();
    const outside = appendElement(document.body, '', 'button');
    outside.textContent = 'Outside';
    const box = await focusMember(fixture, 0);
    await click(outside);

    expect(box.matches(':focus')).toBe(false);
    expectRaise(fixture);
  });

  it.each([
    {
      what: 'disabled',
      end: (member: HTMLElement) => member.setAttribute('disabled', ''),
    },
    { what: 'removed', end: (member: HTMLElement) => member.remove() },
  ])('should not exist after the focused button is $what', async ({ end }) => {
    const fixture = await createGroup();
    await focusMember(fixture, 0);
    end(fixture.members[0]!);
    // An engine can move focus off a disabled control after the next frame.
    await nextFrame();
    await nextFrame();

    expect(getComputedStyle(fixture.group).isolation).toBe('auto');
  });
});
