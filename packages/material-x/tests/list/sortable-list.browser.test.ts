import { $ } from '@ydinjs/core/utils/DOM.js';
import { afterEach, describe, expect, it } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list.ts';
import { ReorderEvent } from '../../src/list/sortable-list.ts';
import { nextFrame, resolveComputed } from '../browser.ts';

type ListTag = 'mx-list' | 'mx-sortable-list';
type ItemTag = 'mx-list-item' | 'mx-list-button-item';

type ListOptions = Readonly<{
  tag?: ListTag;
  item?: ItemTag;
  handles?: boolean;
  /** Keeps the token's landing duration instead of a zero one. */
  tokenLanding?: boolean;
}>;

const DESCRIPTION = 'Use the arrow keys to move';

function createHandle(): HTMLElement {
  const handle = document.createElement('span');
  handle.dataset['handle'] = '';
  handle.slot = 'lead';
  handle.textContent = '≡';
  return handle;
}

function createItem(tag: ItemTag, label: string, handle: boolean): HTMLElement {
  const item = document.createElement(tag);

  if (handle) {
    item.append(createHandle());
  }

  item.append(label);
  return item;
}

async function createList(
  labels: readonly string[],
  {
    tag = 'mx-sortable-list',
    item = 'mx-list-item',
    handles = false,
    tokenLanding = false,
  }: ListOptions = {},
): Promise<readonly [HTMLElement, readonly HTMLElement[]]> {
  const list = document.createElement(tag);

  if (!tokenLanding) {
    list.style.setProperty('--_drag-duration', '0s');
  }

  const items = labels.map((label) => createItem(item, label, handles));
  list.append(...items);
  document.body.append(list);
  await nextFrame();
  return [list, items];
}

function visualOf(item: HTMLElement): HTMLElement {
  return $<HTMLElement>(item, '.host')!;
}

function handleOf(item: HTMLElement): HTMLElement {
  return item.querySelector<HTMLElement>('[data-handle]')!;
}

/** The handle semantics present on `handle`, as attribute names and `touch-action`. */
function written(handle: HTMLElement): readonly string[] {
  return [
    'tabindex',
    'role',
    'aria-label',
    'aria-description',
    ...(handle.style.touchAction ? ['touch-action'] : []),
  ].filter((name) => name === 'touch-action' || handle.hasAttribute(name));
}

function centerOf(element: HTMLElement): readonly [number, number] {
  const { left, top, width, height } = element.getBoundingClientRect();
  return [left + width / 2, top + height / 2];
}

function isDragged(item: HTMLElement): boolean {
  return item.matches(':state(drag)');
}

function placeholderOf(list: HTMLElement): HTMLElement | null {
  return list.querySelector('[data-drag-placeholder]');
}

function announcementOf(list: HTMLElement): string {
  return list.shadowRoot!.querySelector('[aria-live]')!.textContent;
}

function order(list: HTMLElement): readonly string[] {
  return [...list.children]
    .filter((child) => !child.hasAttribute('data-drag-placeholder'))
    .map((child) => child.textContent.replace('≡', ''));
}

/** Records every `reorder` event the list dispatches. */
function recordReorders(list: HTMLElement): ReorderEvent[] {
  const events: ReorderEvent[] = [];
  list.addEventListener('reorder', (event) => {
    events.push(event as ReorderEvent);
  });
  return events;
}

/** Commits each proposed move in the handler, as a synchronous consumer does. */
function commitOnReorder(list: HTMLElement): void {
  list.addEventListener('reorder', (event) => {
    const { item, next } = event as ReorderEvent;
    list.insertBefore(item, next);
  });
}

/** Presses `target`'s center and moves past the drag threshold. */
async function lift(target: HTMLElement): Promise<readonly [number, number]> {
  const [x, y] = centerOf(target);
  await commands.pointerPress(x, y);
  await commands.pointerMove(x, y + 12, 3);
  return [x, y];
}

/** Drags `target` from its center to the center of `over`, offset by `dy`, and releases. */
async function dragOnto(
  target: HTMLElement,
  over: HTMLElement,
  dy = 10,
): Promise<void> {
  const [x] = await lift(target);
  const [, y] = centerOf(over);
  await commands.pointerMove(x, y + dy, 8);
  await commands.pointerRelease();
}

async function whenSettled(
  list: HTMLElement,
  item: HTMLElement,
): Promise<void> {
  await expect
    .poll(() => isDragged(item) || placeholderOf(list) !== null)
    .toBe(false);
}

afterEach(async () => {
  // A row that fails mid-gesture leaves the button down.
  await commands.pointerRelease().catch(() => {});
});

describe('ReorderEvent', () => {
  const event = (): ReorderEvent =>
    new ReorderEvent({
      item: document.body,
      from: 0,
      to: 1,
      previous: null,
      next: null,
    });

  it('should bubble', () => {
    expect(event().bubbles).toBe(true);
  });

  it('should be composed', () => {
    expect(event().composed).toBe(true);
  });

  it('should be cancelable', () => {
    expect(event().cancelable).toBe(true);
  });

  it('should carry the move', () => {
    const next = document.createElement('div');
    const moved = new ReorderEvent({
      item: document.body,
      from: 2,
      to: 0,
      previous: null,
      next,
    });

    expect([
      moved.item,
      moved.from,
      moved.to,
      moved.previous,
      moved.next,
    ]).toEqual([document.body, 2, 0, null, next]);
  });

  it('should cross a shadow boundary to the host', async () => {
    const outer = document.createElement('div');
    document.body.append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    const list = document.createElement('mx-sortable-list');
    list.style.setProperty('--_drag-duration', '0s');
    const [a, b] = [
      createItem('mx-list-item', 'A', false),
      createItem('mx-list-item', 'B', false),
    ];
    list.append(a, b);
    root.append(list);
    await nextFrame();
    const seen: Event[] = [];
    outer.addEventListener('reorder', (e) => {
      seen.push(e);
    });

    await dragOnto(visualOf(a), visualOf(b));
    await whenSettled(list, a);

    expect(seen).toHaveLength(1);
  });
});

describe('mx-list', () => {
  it('should not drag an item', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C'], {
      tag: 'mx-list',
    });
    const events = recordReorders(list);
    await lift(visualOf(a!));
    await commands.pointerMove(...centerOf(visualOf(b!)), 4);

    expect([isDragged(a!), placeholderOf(list), events.length]).toEqual([
      false,
      null,
      0,
    ]);
  });

  it('should write nothing on a handle or an item', async () => {
    const [, [a]] = await createList(['A'], { tag: 'mx-list', handles: true });
    const handle = handleOf(a!);

    expect([
      handle.getAttributeNames().sort(),
      handle.style.touchAction,
      a!.hasAttribute('tabindex'),
      a!.hasAttribute('aria-description'),
    ]).toEqual([['data-handle', 'slot'], '', false, false]);
  });
});

describe('mx-sortable-list pointer', () => {
  it('should not set the drag state before the threshold', async () => {
    const [, [a]] = await createList(['A', 'B']);
    const [x, y] = centerOf(visualOf(a!));
    await commands.pointerPress(x, y);
    await commands.pointerMove(x, y + 4, 2);

    expect(isDragged(a!)).toBe(false);
  });

  it('should set the drag state once the drag activates', async () => {
    const [, [a]] = await createList(['A', 'B']);
    await lift(visualOf(a!));

    expect(isDragged(a!)).toBe(true);
  });

  it('should give the placeholder the list footprint color', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    await lift(visualOf(a!));
    const expected = resolveComputed(
      'background-color',
      getComputedStyle(list).getPropertyValue('--_footprint-color'),
    );

    expect(getComputedStyle(placeholderOf(list)!).backgroundColor).toBe(
      expected,
    );
  });

  it('should dispatch the move with its neighbors on the drop', async () => {
    const [list, [a, b, c]] = await createList(['A', 'B', 'C']);
    const events = recordReorders(list);
    commitOnReorder(list);

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(
      events.map(({ item, from, to, previous, next }) => [
        item,
        from,
        to,
        previous,
        next,
      ]),
    ).toEqual([[a, 0, 1, b, c]]);
  });

  it('should propose a move without reordering the DOM itself', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(order(list)).toEqual(['A', 'B', 'C']);
  });

  it('should land home and keep the order when the move is prevented', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    const home = visualOf(a!).getBoundingClientRect().top;
    list.addEventListener('reorder', (event) => event.preventDefault());

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect([order(list), visualOf(a!).getBoundingClientRect().top]).toEqual([
      ['A', 'B', 'C'],
      home,
    ]);
  });

  it('should settle once the consumer commits in the handler', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);

    await dragOnto(visualOf(a!), visualOf(b!));
    const released = performance.now();
    await whenSettled(list, a!);

    expect([order(list), performance.now() - released < 400]).toEqual([
      ['B', 'A', 'C'],
      true,
    ]);
  });

  it('should settle once the consumer commits one task later', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    list.addEventListener('reorder', (event) => {
      const { item, next } = event as ReorderEvent;
      setTimeout(() => {
        list.insertBefore(item, next);
      });
    });

    await dragOnto(visualOf(a!), visualOf(b!));
    const released = performance.now();
    await whenSettled(list, a!);

    expect([order(list), performance.now() - released < 400]).toEqual([
      ['B', 'A', 'C'],
      true,
    ]);
  });

  it('should keep the item lifted until the consumer commits', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    let commit = (): void => {};
    list.addEventListener('reorder', (event) => {
      const { item, next } = event as ReorderEvent;
      commit = () => {
        list.insertBefore(item, next);
      };
    });

    await dragOnto(visualOf(a!), visualOf(b!));
    await nextFrame();
    const lifted = isDragged(a!);
    commit();
    await whenSettled(list, a!);

    expect(lifted).toBe(true);
  });

  it('should land within the bound when the consumer never commits', async () => {
    const [, [a, b]] = await createList(['A', 'B', 'C']);

    await dragOnto(visualOf(a!), visualOf(b!));
    const released = performance.now();
    await expect.poll(() => isDragged(a!), { timeout: 2000 }).toBe(false);

    expect(performance.now() - released).toBeLessThan(1500);
  });

  it('should clear the drag state on pointercancel', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    let pointerId = -1;
    list.addEventListener('pointerdown', (event) => {
      ({ pointerId } = event);
    });
    await lift(visualOf(a!));

    window.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId, bubbles: true }),
    );
    await whenSettled(list, a!);

    expect(isDragged(a!)).toBe(false);
  });

  it('should tear down when the list disconnects mid-drag', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    await lift(visualOf(a!));

    list.remove();
    await nextFrame();

    expect([isDragged(a!), placeholderOf(list)]).toEqual([false, null]);
  });

  it('should drag again after disconnecting mid-drag and reconnecting', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    const events = recordReorders(list);
    await lift(visualOf(a!));
    list.remove();
    await commands.pointerRelease();
    document.body.append(list);
    await nextFrame();

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(events.map(({ from, to }) => [from, to])).toEqual([[0, 1]]);
  });

  it('should stop and dispatch nothing more when the list disconnects during the commit wait', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    const events = recordReorders(list);

    await dragOnto(visualOf(a!), visualOf(b!));
    list.remove();
    await nextFrame();

    expect([events.length, isDragged(a!), placeholderOf(list)]).toEqual([
      1,
      false,
      null,
    ]);
  });

  it('should drag an item without a handle by its whole surface', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    const [left, top] = [
      visualOf(a!).getBoundingClientRect().left + 4,
      centerOf(visualOf(a!))[1],
    ];
    await commands.pointerPress(left, top);
    await commands.pointerMove(left, top + 12, 3);

    expect(isDragged(a!)).toBe(true);
    await commands.pointerRelease();
    await whenSettled(list, a!);
  });

  it('should start a drag when the press lands on the handle', async () => {
    const [, [a]] = await createList(['A', 'B'], { handles: true });
    await lift(handleOf(a!));

    expect(isDragged(a!)).toBe(true);
  });

  it('should not start a drag when the press misses the handle', async () => {
    const [, [a]] = await createList(['A', 'B'], { handles: true });
    const { right } = visualOf(a!).getBoundingClientRect();
    const [, y] = centerOf(visualOf(a!));
    await commands.pointerPress(right - 8, y);
    await commands.pointerMove(right - 8, y + 12, 3);

    expect(isDragged(a!)).toBe(false);
  });

  it('should describe the collection after an item is added during a drag', async () => {
    const [list, [, b, c]] = await createList(['A', 'B', 'C']);
    const events = recordReorders(list);
    const [x] = await lift(visualOf(b!));
    list.prepend(createItem('mx-list-item', 'Z', false));
    await nextFrame();
    await nextFrame();
    const [, y] = centerOf(visualOf(c!));
    await commands.pointerMove(x, y + 10, 8);
    await commands.pointerRelease();
    await whenSettled(list, b!);

    expect(events.map(({ from, to }) => [from, to])).toEqual([[2, 3]]);
  });

  it('should announce a pointer drop by position', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(announcementOf(list)).toBe('Item 2 of 3.');
  });

  it.skipIf(server.provider !== 'playwright')(
    'should land with zero duration under reduced motion',
    async () => {
      await commands.emulateReducedMotion(true);

      try {
        const [list, [a, b]] = await createList(['A', 'B', 'C'], {
          tokenLanding: true,
        });
        commitOnReorder(list);
        const visual = visualOf(a!);
        const durations: unknown[] = [];
        const animate = visual.animate.bind(visual);
        visual.animate = (keyframes, options) => {
          durations.push((options as KeyframeAnimationOptions).duration);
          return animate(keyframes, options);
        };

        await dragOnto(visual, visualOf(b!));
        await whenSettled(list, a!);

        expect(durations).toEqual([0]);
      } finally {
        await commands.emulateReducedMotion(false);
      }
    },
  );
});

describe('mx-sortable-list keyboard', () => {
  it('should move the item one slot on ArrowDown from its focused handle', async () => {
    const [list, [a, b, c]] = await createList(['A', 'B', 'C'], {
      handles: true,
    });
    const events = recordReorders(list);
    commitOnReorder(list);
    handleOf(a!).focus();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect(
      events.map(({ item, from, to, previous, next }) => [
        item,
        from,
        to,
        previous,
        next,
      ]),
    ).toEqual([[a, 0, 1, b, c]]);
  });

  it('should not move an item with a handle from another focused element', async () => {
    const [list, [a]] = await createList(['A', 'B'], { handles: true });
    const events = recordReorders(list);
    const button = document.createElement('button');
    button.slot = 'trail';
    a!.append(button);
    await nextFrame();
    button.focus();

    await userEvent.keyboard('{ArrowDown}');
    await nextFrame();

    expect([document.activeElement, events.length, isDragged(a!)]).toEqual([
      button,
      0,
      false,
    ]);
  });

  it('should settle promptly on the consumer commit', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C'], { handles: true });
    commitOnReorder(list);
    handleOf(a!).focus();

    const pressed = performance.now();
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect([order(list), performance.now() - pressed < 400]).toEqual([
      ['B', 'A', 'C'],
      true,
    ]);
  });

  it('should keep focus on the handle and move again on a second ArrowDown', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C'], { handles: true });
    commitOnReorder(list);
    handleOf(a!).focus();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);
    const focused = document.activeElement === handleOf(a!);
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect([focused, order(list)]).toEqual([true, ['B', 'C', 'A']]);
  });

  it('should announce a keyboard move by position', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C'], { handles: true });
    commitOnReorder(list);
    handleOf(a!).focus();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect(announcementOf(list)).toBe('Item 2 of 3.');
  });

  it('should move a button item without a handle from its focused button', async () => {
    const [list, [a]] = await createList(['A', 'B'], {
      item: 'mx-list-button-item',
    });
    commitOnReorder(list);
    a!.focus();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect(order(list)).toEqual(['B', 'A']);
  });

  it('should keep Space activating a button item without a handle', async () => {
    const [list, [a]] = await createList(['A', 'B'], {
      item: 'mx-list-button-item',
    });
    const events = recordReorders(list);
    let clicks = 0;
    a!.addEventListener('click', () => {
      clicks += 1;
    });
    a!.focus();

    await userEvent.keyboard('[Space]');

    expect([clicks, events.length]).toEqual([1, 0]);
  });

  it('should leave the arrow keys to a control marked data-drag-ignore', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    const events = recordReorders(list);
    const input = document.createElement('input');
    input.dataset['dragIgnore'] = '';
    input.slot = 'trail';
    input.value = 'abc';
    a!.append(input);
    await nextFrame();
    input.focus();
    input.setSelectionRange(0, 0);

    await userEvent.keyboard('{ArrowRight}');
    await nextFrame();

    expect([
      document.activeElement,
      input.selectionStart,
      events.length,
    ]).toEqual([input, 1, 0]);
  });
});

describe('mx-sortable-list static item focus', () => {
  /** A button before the list, so Tab enters the list from outside it. */
  function startBefore(list: HTMLElement): HTMLButtonElement {
    const before = document.createElement('button');
    list.before(before);
    before.focus();
    return before;
  }

  it('should make a static item without a handle a tab stop', async () => {
    const [list, [a]] = await createList(['A', 'B']);
    startBefore(list);

    await userEvent.tab();

    expect(a!.shadowRoot!.activeElement).toBe(visualOf(a!));
  });

  it('should move a focused static item on ArrowDown', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);
    startBefore(list);
    await userEvent.tab();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect(order(list)).toEqual(['B', 'A', 'C']);
  });

  it('should keep focus on the inner element and move again after a keyboard move', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);
    startBefore(list);
    await userEvent.tab();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);
    const focused = a!.shadowRoot!.activeElement === visualOf(a!);
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect([focused, order(list)]).toEqual([true, ['B', 'C', 'A']]);
  });

  it('should show the focus indicator on a focused static item', async () => {
    const [list] = await createList(['A']);
    const [a] = [...list.children] as HTMLElement[];
    startBefore(list);

    await userEvent.tab();
    const { outlineStyle, outlineWidth } = getComputedStyle(visualOf(a!));

    expect([outlineStyle, outlineWidth === '0px']).toEqual(['solid', false]);
  });

  it('should describe a focused static item with the arrow keys', async () => {
    const [list, [a]] = await createList(['A']);
    startBefore(list);

    await userEvent.tab();

    expect(a!.shadowRoot!.activeElement!.getAttribute('aria-description')).toBe(
      DESCRIPTION,
    );
  });

  it('should not make a static item a tab stop in mx-list', async () => {
    const [, [a]] = await createList(['A'], { tag: 'mx-list' });

    expect(visualOf(a!).hasAttribute('tabindex')).toBe(false);
  });

  it('should remove the tab stop once the item has a handle', async () => {
    const [, [a]] = await createList(['A']);
    a!.prepend(createHandle());
    await nextFrame();

    expect([
      visualOf(a!).hasAttribute('tabindex'),
      visualOf(a!).hasAttribute('aria-description'),
    ]).toEqual([false, false]);
  });

  it('should restore the tab stop once the handle is removed', async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    handleOf(a!).remove();
    await nextFrame();

    expect([
      visualOf(a!).getAttribute('tabindex'),
      visualOf(a!).getAttribute('aria-description'),
    ]).toEqual(['0', DESCRIPTION]);
  });

  it('should remove the tab stop once the item leaves the list', async () => {
    const [, [a]] = await createList(['A']);
    document.body.append(a!);
    await nextFrame();

    expect([
      visualOf(a!).hasAttribute('tabindex'),
      visualOf(a!).hasAttribute('aria-description'),
    ]).toEqual([false, false]);
  });

  it('should write no attribute on the item host', async () => {
    const [, [a]] = await createList(['A']);
    const names = [a!.getAttributeNames()];
    const handle = createHandle();
    a!.prepend(handle);
    await nextFrame();
    names.push(a!.getAttributeNames());
    handle.remove();
    await nextFrame();
    names.push(a!.getAttributeNames());
    document.body.append(a!);
    await nextFrame();
    names.push(a!.getAttributeNames());

    expect(names).toEqual([[], [], [], []]);
  });

  it('should add no tab stop to a button item', async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });

    expect([
      a!.hasAttribute('tabindex'),
      visualOf(a!).hasAttribute('tabindex'),
    ]).toEqual([false, false]);
  });
});

describe('mx-sortable-list handle semantics', () => {
  it('should make the handle a described Reorder button', async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    const handle = handleOf(a!);

    expect([
      handle.getAttribute('tabindex'),
      handle.getAttribute('role'),
      handle.getAttribute('aria-label'),
      handle.getAttribute('aria-description'),
      handle.style.touchAction,
    ]).toEqual(['0', 'button', 'Reorder', DESCRIPTION, 'none']);
  });

  it('should keep the values the consumer set on the handle', async () => {
    const [list] = await createList([]);
    const a = createItem('mx-list-item', 'A', true);
    const handle = handleOf(a);
    handle.setAttribute('aria-label', 'Move A');
    handle.setAttribute('role', 'img');
    list.append(a);
    await nextFrame();

    expect([
      handle.getAttribute('aria-label'),
      handle.getAttribute('role'),
    ]).toEqual(['Move A', 'img']);
  });

  it('should cover a handle added after the item is slotted', async () => {
    const [, [a]] = await createList(['A']);
    const handle = createHandle();
    a!.prepend(handle);
    await nextFrame();

    expect([
      handle.getAttribute('role'),
      handle.getAttribute('aria-label'),
    ]).toEqual(['button', 'Reorder']);
  });

  it('should describe a button item without a handle on its button', async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });
    await nextFrame();

    expect(visualOf(a!).getAttribute('aria-description')).toBe(DESCRIPTION);
  });

  it('should move the description from the button to a handle added later', async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });
    const handle = createHandle();
    a!.prepend(handle);
    await nextFrame();

    expect([
      visualOf(a!).hasAttribute('aria-description'),
      handle.getAttribute('aria-description'),
    ]).toEqual([false, DESCRIPTION]);
  });

  it('should move the description back to the button once the handle is removed', async () => {
    const [, [a]] = await createList(['A'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const handle = handleOf(a!);
    handle.remove();
    await nextFrame();

    expect([
      visualOf(a!).getAttribute('aria-description'),
      written(handle),
    ]).toEqual([DESCRIPTION, []]);
  });

  it('should remove what it wrote and keep the consumer values in mx-list', async () => {
    const [list] = await createList([]);
    const a = createItem('mx-list-item', 'A', true);
    const handle = handleOf(a);
    handle.setAttribute('aria-label', 'Move A');
    list.append(a);
    await nextFrame();
    const plain = document.createElement('mx-list');
    document.body.append(plain);
    plain.append(a);
    await nextFrame();

    expect([written(handle), handle.getAttribute('aria-label')]).toEqual([
      ['aria-label'],
      'Move A',
    ]);
  });

  it('should leave the items of an mx-list nested in an item plain', async () => {
    const [, [a]] = await createList(['A']);
    const nested = document.createElement('mx-list');
    const inner = createItem('mx-list-item', 'Inner', false);
    const handled = createItem('mx-list-item', 'Handled', true);
    nested.append(inner, handled);
    a!.append(nested);
    await nextFrame();

    expect([
      visualOf(inner).getAttributeNames(),
      written(handleOf(handled)),
    ]).toEqual([['class', 'part'], []]);
  });
});

describe('mx-list-item focus', () => {
  async function createStatic(tag: ListTag): Promise<HTMLElement> {
    const [, [a]] = await createList(['A'], { tag });
    return a!;
  }

  function surround(
    item: HTMLElement,
  ): readonly [HTMLButtonElement, HTMLButtonElement] {
    const before = document.createElement('button');
    const after = document.createElement('button');
    item.parentElement!.before(before);
    item.parentElement!.after(after);
    before.focus();
    return [before, after];
  }

  it('should take focus on its inner element by Tab in mx-sortable-list', async () => {
    const a = await createStatic('mx-sortable-list');
    surround(a);

    await userEvent.tab();

    expect(a.shadowRoot!.activeElement).toBe(visualOf(a));
  });

  it('should leave by Tab after one stop', async () => {
    const a = await createStatic('mx-sortable-list');
    const [, after] = surround(a);

    await userEvent.tab();
    await userEvent.tab();

    expect(document.activeElement).toBe(after);
  });

  it('should return by Shift+Tab', async () => {
    const a = await createStatic('mx-sortable-list');
    surround(a);

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab({ shift: true });

    expect(a.shadowRoot!.activeElement).toBe(visualOf(a));
  });

  it('should take focus by focus() in mx-sortable-list', async () => {
    const a = await createStatic('mx-sortable-list');

    a.focus();

    expect(a.shadowRoot!.activeElement).toBe(visualOf(a));
  });

  it('should not take focus by Tab in mx-list', async () => {
    const a = await createStatic('mx-list');
    const [, after] = surround(a);

    await userEvent.tab();

    expect(document.activeElement).toBe(after);
  });

  it('should not take focus by focus() in mx-list', async () => {
    const a = await createStatic('mx-list');
    const [before] = surround(a);

    a.focus();

    expect(document.activeElement).toBe(before);
  });
});

describe('mx-sortable-list definition order', () => {
  /**
   * Parses the markup in a fresh document, then evaluates the modules in the
   * given order, so each element upgrades with the markup already there.
   */
  async function parseThenDefine(
    modules: readonly string[],
  ): Promise<HTMLElement> {
    const frame = document.createElement('iframe');
    const urls = modules.map(
      (name) => new URL(`../../src/list/${name}`, import.meta.url).href,
    );
    frame.srcdoc = `<mx-sortable-list><mx-list-item>A</mx-list-item></mx-sortable-list>
<script type="module">
for (const url of ${JSON.stringify(urls)}) await import(url);
document.body.dataset.ready = '';
</script>`;
    document.body.append(frame);
    await expect
      .poll(() => frame.contentDocument?.body.dataset['ready'], {
        timeout: 10_000,
      })
      .toBe('');
    await nextFrame();
    return frame.contentDocument!.querySelector('mx-list-item')!;
  }

  it('should make a static item a tab stop when sortable-list.js is evaluated first', async () => {
    const a = await parseThenDefine(['sortable-list.ts', 'list-item.ts']);

    expect(visualOf(a).getAttribute('tabindex')).toBe('0');
  });

  // A consumer that connects before its provider is defined doesn't resolve
  // it yet (repo:RF-69). This row passes once it does.
  it.fails('should make a static item a tab stop when list-item.js is evaluated first', async () => {
    const a = await parseThenDefine(['list-item.ts', 'sortable-list.ts']);

    expect(visualOf(a).getAttribute('tabindex')).toBe('0');
  });
});
