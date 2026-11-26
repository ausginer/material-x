import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { commands, server, userEvent } from 'vitest/browser';
import '../../src/button/icon-button.ts';
import '../../src/icon/icon.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/list-link-item.ts';
import '../../src/list/list.ts';
import { ReorderEvent } from '../../src/list/sortable-list.ts';
import { nextFrame, whenFontsReady } from '../browser.ts';
import { TAB } from '../focus-indicator.ts';

type ListTag = 'mx-list' | 'mx-sortable-list';
type ItemTag = 'mx-list-item' | 'mx-list-button-item' | 'mx-list-link-item';

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

  if (tag === 'mx-list-link-item') {
    item.setAttribute('href', '#target');
  }

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

/** The item's box: an interactive item's control, or a static item's host. */
function visualOf(item: HTMLElement): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('.host') ?? item;
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

/** Whether the list's placeholder paints its drop zone. */
function paintsDropZone(list: HTMLElement): boolean {
  const { visibility, backgroundColor, opacity } = getComputedStyle(
    placeholderOf(list)!,
  );

  return (
    visibility === 'visible' &&
    backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    Number(opacity) > 0
  );
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

  it('should keep the landing duration of the first landing in a connection', async () => {
    const [list, [a, b, c]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);
    const durations: unknown[] = [];
    const visual = visualOf(a!);
    const animate = visual.animate.bind(visual);
    visual.animate = (keyframes, options) => {
      durations.push((options as KeyframeAnimationOptions).duration);
      return animate(keyframes, options);
    };

    await dragOnto(visual, visualOf(b!));
    await whenSettled(list, a!);
    list.style.setProperty('--_drag-duration', '0.01s');
    await dragOnto(visual, visualOf(c!));
    await whenSettled(list, a!);

    expect(durations).toEqual([0, 0]);
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

describe('mx-sortable-list drop zone', () => {
  /** Commits each proposed move 100 ms after it. */
  function commitLater(list: HTMLElement): void {
    list.addEventListener('reorder', (event) => {
      const { item, next } = event as ReorderEvent;
      setTimeout(() => {
        list.insertBefore(item, next);
      }, 100);
    });
  }

  /** What the placeholder paints in each `reorder` handler. */
  function readInHandler(list: HTMLElement): readonly boolean[] {
    const read: boolean[] = [];
    list.addEventListener('reorder', () => {
      read.push(paintsDropZone(list));
    });
    return read;
  }

  /** What the placeholder paints in each frame until it goes. */
  async function readFrames(list: HTMLElement): Promise<readonly boolean[]> {
    const read: boolean[] = [];

    while (placeholderOf(list)) {
      read.push(paintsDropZone(list));
      // oxlint-disable-next-line no-await-in-loop -- one read per frame
      await nextFrame();
    }

    return read;
  }

  /** Focuses `item` and presses ArrowDown. */
  async function moveDown(item: HTMLElement): Promise<void> {
    item.focus();
    await userEvent.keyboard('{ArrowDown}');
  }

  it.each(['ArrowDown', 'ArrowUp'])(
    'should paint nothing in the handler of a move by %s',
    async (key) => {
      const [list, [, b]] = await createList(['A', 'B', 'C']);
      const read = readInHandler(list);
      commitOnReorder(list);

      b!.focus();
      await userEvent.keyboard(`{${key}}`);
      await whenSettled(list, b!);

      expect(read).toEqual([false]);
    },
  );

  it('should paint nothing in any frame while the commit of a key move is pending', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);
    commitLater(list);
    let frames: Promise<readonly boolean[]> | undefined;
    list.addEventListener('reorder', () => {
      frames = readFrames(list);
    });

    await moveDown(a!);
    const read = await frames!;

    expect([read.length > 1, read.includes(true), order(list)]).toEqual([
      true,
      false,
      ['B', 'A', 'C'],
    ]);
  });

  it('should paint nothing in the handler of a refused key move', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);
    const read = readInHandler(list);
    list.addEventListener('reorder', (event) => event.preventDefault());

    await moveDown(a!);
    await whenSettled(list, a!);

    expect(read).toEqual([false]);
  });

  it('should paint the drop zone in a pointer drag', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);

    await lift(visualOf(a!));

    expect(paintsDropZone(list)).toBe(true);
  });

  it('should paint the drop zone in the handler of a pointer drop', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    const read = readInHandler(list);
    commitOnReorder(list);

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(read).toEqual([true]);
  });

  it('should paint the drop zone in each frame while the commit of a pointer drop is pending', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);
    commitLater(list);
    let frames: Promise<readonly boolean[]> | undefined;
    list.addEventListener('reorder', () => {
      frames = readFrames(list);
    });

    await dragOnto(visualOf(a!), visualOf(b!));
    const read = await frames!;

    expect([read.length > 1, read.includes(false), order(list)]).toEqual([
      true,
      false,
      ['B', 'A', 'C'],
    ]);
  });

  it.each<
    readonly [string, (list: HTMLElement, item: HTMLElement) => Promise<void>]
  >([
    [
      'an accepted key move',
      async (list, item) => {
        commitOnReorder(list);
        await moveDown(item);
      },
    ],
    [
      'a refused key move',
      async (list, item) => {
        list.addEventListener('reorder', (event) => event.preventDefault());
        await moveDown(item);
      },
    ],
    [
      'a key move that timed out',
      async (list, item) => {
        await moveDown(item);
        expect(placeholderOf(list)).not.toBeNull();
        await expect
          .poll(() => placeholderOf(list), { timeout: 2000 })
          .toBeNull();
      },
    ],
    [
      'a disconnection during the commit of a key move',
      async (list, item) => {
        await moveDown(item);
        expect(placeholderOf(list)).not.toBeNull();
        list.remove();
        await nextFrame();
        document.body.append(list);
        await nextFrame();
      },
    ],
  ])(
    'should paint the drop zone in the pointer drag after %s',
    async (_, move) => {
      const [list, [a, , c]] = await createList(['A', 'B', 'C']);
      const events = recordReorders(list);
      await move(list, a!);
      await whenSettled(list, a!);

      await lift(visualOf(c!));

      // The key move ran, so the state was set.
      expect([events.length, paintsDropZone(list)]).toEqual([1, true]);
    },
  );
});

describe('mx-sortable-list lifted item in a key move', () => {
  type Look = Readonly<Record<string, string>>;

  const ITEMS: ReadonlyArray<
    readonly [string, Readonly<{ item: ItemTag; selected: boolean }>]
  > = [
    ['a static item', { item: 'mx-list-item', selected: false }],
    ['a button item', { item: 'mx-list-button-item', selected: false }],
    ['a selected button item', { item: 'mx-list-button-item', selected: true }],
  ];

  /** Creates a list and focuses its first item, which has an icon on each side. */
  async function createFocused({
    item,
    selected,
  }: Readonly<{ item: ItemTag; selected: boolean }>): Promise<
    readonly [HTMLElement, HTMLElement]
  > {
    const [list, [a]] = await createList(['A', 'B', 'C'], { item });
    for (const slot of ['lead', 'trail']) {
      const icon = document.createElement('i');
      icon.slot = slot;
      icon.dataset['icon'] = '';
      a!.append(icon);
    }
    a!.toggleAttribute('selected', selected);
    a!.focus();
    await nextFrame();
    // The focused shape transitions.
    await Promise.all(
      visualOf(a!)
        .getAnimations()
        .map(async ({ finished }) => await finished),
    );
    return [list, a!];
  }

  function lookOf(item: HTMLElement): Look {
    const { backgroundColor, color, borderTopLeftRadius } = getComputedStyle(
      visualOf(item),
    );
    const colorOf = (element: Element): string =>
      getComputedStyle(element).color;

    return {
      backgroundColor,
      color,
      borderTopLeftRadius,
      ripple: getComputedStyle(item).getPropertyValue('--_ripple-color'),
      label: colorOf(item.shadowRoot!.querySelector('.label')!),
      lead: colorOf(item.querySelector('[slot=lead]')!),
      trail: colorOf(item.querySelector('[slot=trail]')!),
    };
  }

  it.each(ITEMS)(
    'should have its resting colors and corners in the handler, for %s',
    async (_, options) => {
      const [list, item] = await createFocused(options);
      const rest = lookOf(item);
      const read: Array<readonly [boolean, Look]> = [];
      list.addEventListener('reorder', () => {
        read.push([isDragged(item), lookOf(item)]);
      });
      commitOnReorder(list);

      await userEvent.keyboard('{ArrowDown}');
      await whenSettled(list, item);

      expect(read).toEqual([[true, rest]]);
    },
  );

  it.each(ITEMS)(
    'should have its resting colors and corners in each frame while the commit is pending, for %s',
    async (_, options) => {
      const [list, item] = await createFocused(options);
      const rest = lookOf(item);
      const read: Look[] = [];
      let frames: Promise<void> | undefined;
      list.addEventListener('reorder', (event) => {
        const { next } = event as ReorderEvent;
        setTimeout(() => {
          list.insertBefore(item, next);
        }, 100);
        frames = (async () => {
          while (isDragged(item)) {
            read.push(lookOf(item));
            // oxlint-disable-next-line no-await-in-loop -- one read per frame
            await nextFrame();
          }
        })();
      });

      await userEvent.keyboard('{ArrowDown}');
      await frames!;

      expect(read.length).toBeGreaterThan(1);
      expect(read).toEqual(read.map(() => rest));
    },
  );

  it('should take the dragged elevation', async () => {
    const [list, item] = await createFocused({
      item: 'mx-list-item',
      selected: false,
    });
    const read: string[] = [];
    list.addEventListener('reorder', () => {
      read.push(
        getComputedStyle(item).getPropertyValue('--_container-elevation'),
      );
    });

    await userEvent.keyboard('{ArrowDown}');

    expect(read).toEqual(['8']);
  });

  it("should keep a page's background-color and color on a static item", async () => {
    const [list, item] = await createFocused({
      item: 'mx-list-item',
      selected: false,
    });
    item.style.backgroundColor = 'rgb(0, 0, 255)';
    item.style.color = 'rgb(255, 0, 0)';
    const read: Array<readonly [string, string]> = [];
    const record = (): void => {
      const { backgroundColor, color } = getComputedStyle(item);
      read.push([backgroundColor, color]);
    };
    list.addEventListener('reorder', record);
    commitOnReorder(list);

    record();
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, item);
    record();

    expect(read).toEqual(
      Array.from({ length: 3 }, () => ['rgb(0, 0, 255)', 'rgb(255, 0, 0)']),
    );
  });

  it("should keep a static item's own background-color and color with a page rule for popovers", async () => {
    const style = document.createElement('style');
    style.textContent = '[popover] { background: red; color: blue; }';
    document.head.append(style);
    onTestFinished(() => style.remove());
    const [list, item] = await createFocused({
      item: 'mx-list-item',
      selected: false,
    });
    const read: Array<readonly [string, string]> = [];
    const record = (): void => {
      const { backgroundColor, color } = getComputedStyle(item);
      read.push([backgroundColor, color]);
    };
    list.addEventListener('reorder', record);
    commitOnReorder(list);

    record();
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, item);
    record();

    expect(read).toEqual(Array.from({ length: 3 }, () => read[0]));
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

    expect(document.activeElement).toBe(a);
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

  it('should keep focus on the host and move again after a keyboard move', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C']);
    commitOnReorder(list);
    startBefore(list);
    await userEvent.tab();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);
    const focused = document.activeElement === a;
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
    const [list] = await createList(['A']);
    startBefore(list);

    await userEvent.tab();

    expect(document.activeElement!.getAttribute('aria-description')).toBe(
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

  it('should remove the tab stop once the item moves into mx-list', async () => {
    const [, [a]] = await createList(['A']);
    const plain = document.createElement('mx-list');
    document.body.append(plain);
    plain.append(a!);
    await nextFrame();

    expect([
      a!.hasAttribute('tabindex'),
      a!.hasAttribute('aria-description'),
    ]).toEqual([false, false]);
  });

  it('should write only the tab stop and the description on the host', async () => {
    const [, [a]] = await createList(['A']);

    expect(a!.getAttributeNames().toSorted()).toEqual([
      'aria-description',
      'tabindex',
    ]);
  });

  it("should keep the consumer's tabindex and description on the host", async () => {
    const [list] = await createList([]);
    const a = createItem('mx-list-item', 'A', false);
    a.setAttribute('tabindex', '-1');
    a.setAttribute('aria-description', 'Mine');
    const read = (): readonly string[] => [
      ...a.getAttributeNames().toSorted(),
      a.getAttribute('tabindex')!,
      a.getAttribute('aria-description')!,
    ];
    const consumer = ['aria-description', 'tabindex', '-1', 'Mine'];
    list.append(a);
    await nextFrame();
    const readings = [read()];
    const handle = createHandle();
    a.prepend(handle);
    await nextFrame();
    readings.push(read());
    handle.remove();
    await nextFrame();
    readings.push(read());
    document.body.append(a);
    await nextFrame();
    readings.push(read());
    list.append(a);
    await nextFrame();
    const plain = document.createElement('mx-list');
    document.body.append(plain);
    plain.append(a);
    await nextFrame();
    readings.push(read());

    expect(readings).toEqual([
      consumer,
      consumer,
      consumer,
      consumer,
      consumer,
    ]);
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
    ]).toEqual([[], []]);
  });
});

describe('mx-sortable-list disabled items', () => {
  const ITEMS = ['mx-list-button-item', 'mx-list-link-item'] as const;

  async function setDisabled(item: HTMLElement, value: boolean): Promise<void> {
    item.toggleAttribute('disabled', value);
    await nextFrame();
  }

  /** The handle's semantics, with their values. */
  function semantics(handle: HTMLElement): Record<string, string | null> {
    return {
      ...Object.fromEntries(
        [
          'tabindex',
          'role',
          'aria-label',
          'aria-description',
          'aria-disabled',
        ].map((name) => [name, handle.getAttribute(name)]),
      ),
      'touch-action': handle.style.touchAction,
    };
  }

  const ENABLED = {
    tabindex: '0',
    role: 'button',
    'aria-label': 'Reorder',
    'aria-description': DESCRIPTION,
    'aria-disabled': null,
    'touch-action': 'none',
  };
  const DISABLED = {
    tabindex: '-1',
    role: 'button',
    'aria-label': 'Reorder',
    'aria-description': null,
    'aria-disabled': 'true',
    'touch-action': '',
  };

  describe.each(ITEMS)('%s', (tag) => {
    it('should propose nothing in a pointer drag by its handle', async () => {
      const [list, [a, b]] = await createList(['A', 'B', 'C'], {
        item: tag,
        handles: true,
      });
      const events = recordReorders(list);
      await setDisabled(a!, true);

      await dragOnto(handleOf(a!), visualOf(b!));

      expect([events, isDragged(a!)]).toEqual([[], false]);
    });

    it('should propose nothing in a pointer drag without a handle', async () => {
      const [list, [a, b]] = await createList(['A', 'B', 'C'], { item: tag });
      const events = recordReorders(list);
      await setDisabled(a!, true);

      await dragOnto(visualOf(a!), visualOf(b!));

      expect([events, isDragged(a!)]).toEqual([[], false]);
    });

    it('should propose nothing for an arrow key on its focused handle', async () => {
      const [list, [a]] = await createList(['A', 'B', 'C'], {
        item: tag,
        handles: true,
      });
      const events = recordReorders(list);
      await setDisabled(a!, true);

      handleOf(a!).focus();
      await userEvent.keyboard('{ArrowDown}');

      expect([document.activeElement, events]).toEqual([handleOf(a!), []]);
    });

    it("should propose nothing for an arrow key on a page's control in an item without a handle", async () => {
      const [list, [a]] = await createList(['A', 'B', 'C'], { item: tag });
      const events = recordReorders(list);
      const control = document.createElement('button');
      control.slot = 'trail';
      a!.append(control);
      await setDisabled(a!, true);

      control.focus();
      await userEvent.keyboard('{ArrowDown}');

      expect([document.activeElement, events]).toEqual([control, []]);
    });

    it('should let an enabled item move past it', async () => {
      const [list, [a, b]] = await createList(['A', 'B', 'C'], {
        item: tag,
        handles: true,
      });
      commitOnReorder(list);
      await setDisabled(a!, true);

      handleOf(b!).focus();
      await userEvent.keyboard('{ArrowUp}');
      await whenSettled(list, b!);

      expect(order(list)).toEqual(['B', 'A', 'C']);
    });

    it.each(['span', 'button', 'mx-icon-button'])(
      'should have a %s handle that Tab skips',
      async (name) => {
        const before = document.createElement('button');
        document.body.append(before);
        const [, [a, b]] = await createList(['A', 'B'], { item: tag });

        for (const item of [a!, b!]) {
          const handle = document.createElement(name);
          handle.dataset['handle'] = '';
          handle.slot = 'lead';
          handle.textContent = '≡';
          item.append(handle);
        }

        await setDisabled(a!, true);
        before.focus();
        await userEvent.keyboard(TAB);
        const first = document.activeElement;
        await userEvent.keyboard(TAB);

        // The enabled item's own control, and then its handle.
        expect([first, document.activeElement]).toEqual([b, handleOf(b!)]);
      },
    );

    it('should write the semantics of a disabled handle from the start', async () => {
      const list = document.createElement('mx-sortable-list');
      const item = createItem(tag, 'A', true);
      item.toggleAttribute('disabled', true);
      list.append(item);
      document.body.append(list);
      await nextFrame();

      expect(semantics(handleOf(item))).toEqual(DISABLED);
    });

    it('should write the semantics of a disabled handle after it is disabled', async () => {
      const [, [a]] = await createList(['A'], { item: tag, handles: true });
      const enabled = semantics(handleOf(a!));

      await setDisabled(a!, true);

      expect([enabled, semantics(handleOf(a!))]).toEqual([ENABLED, DISABLED]);
    });

    it('should write the semantics of a handle again after it is enabled', async () => {
      const [, [a]] = await createList(['A'], { item: tag, handles: true });

      await setDisabled(a!, true);
      await setDisabled(a!, false);

      expect(semantics(handleOf(a!))).toEqual(ENABLED);
    });

    it('should describe the control of an item without a handle only while it is enabled', async () => {
      const [, [a]] = await createList(['A'], { item: tag });
      const read = () => visualOf(a!).getAttribute('aria-description');
      const enabled = read();

      await setDisabled(a!, true);
      const disabled = read();
      await setDisabled(a!, false);

      expect([enabled, disabled, read()]).toEqual([
        DESCRIPTION,
        null,
        DESCRIPTION,
      ]);
    });
  });

  it('should keep the values that the page set on a handle', async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });
    const handle = createHandle();
    const own = {
      tabindex: '3',
      'aria-disabled': 'false',
      'aria-description': 'Own',
    };

    for (const [name, value] of Object.entries(own)) {
      handle.setAttribute(name, value);
    }

    handle.style.touchAction = 'pan-x';
    a!.append(handle);
    await nextFrame();
    await setDisabled(a!, true);
    const disabled = semantics(handle);
    await setDisabled(a!, false);
    const expected = { ...own, 'touch-action': 'pan-x' };

    expect(disabled).toMatchObject(expected);
    expect(semantics(handle)).toMatchObject(expected);
  });

  it('should keep the aria-disabled that the page writes on a disabled handle', async () => {
    const [, [a]] = await createList(['A'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const handle = handleOf(a!);

    await setDisabled(a!, true);
    handle.setAttribute('aria-disabled', 'false');
    await nextFrame();
    await setDisabled(a!, false);

    expect(handle.getAttribute('aria-disabled')).toBe('false');
  });

  it('should keep the touch-action that the page writes on a handle after the claim', async () => {
    const [, [a]] = await createList(['A'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const { style } = handleOf(a!);

    style.touchAction = 'pan-x';
    await setDisabled(a!, true);
    const disabled = style.touchAction;
    await setDisabled(a!, false);

    expect([disabled, style.touchAction]).toEqual(['pan-x', 'pan-x']);
  });

  it('should write nothing on the handle of an item that left when it is disabled', async () => {
    const [, [a]] = await createList(['A'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const plain = document.createElement('mx-list');
    document.body.append(plain);
    plain.append(a!);
    await nextFrame();
    const left = semantics(handleOf(a!));

    await setDisabled(a!, true);

    expect(semantics(handleOf(a!))).toEqual(left);
  });

  it.each(['span', 'button'])(
    'should keep focus on a %s handle that has it, and move with it again once enabled',
    async (name) => {
      const [list, [a]] = await createList(['A', 'B', 'C'], {
        item: 'mx-list-button-item',
      });
      const events = recordReorders(list);
      const handle = document.createElement(name);
      handle.dataset['handle'] = '';
      handle.slot = 'lead';
      handle.textContent = '≡';
      a!.append(handle);
      await nextFrame();
      commitOnReorder(list);

      handle.focus();
      await setDisabled(a!, true);
      // Focus that an element lost for its tab index is fixed up later.
      await nextFrame();
      const during = document.activeElement;
      await userEvent.keyboard('{ArrowDown}');
      const inactive = events.length;
      await setDisabled(a!, false);
      const after = document.activeElement;
      await userEvent.keyboard('{ArrowDown}');
      await whenSettled(list, a!);

      expect([during, inactive, after, events.length]).toEqual([
        handle,
        0,
        handle,
        1,
      ]);
    },
  );

  describe('disabled in its reorder handler', () => {
    async function createDisabling() {
      const result = await createList(['A', 'B', 'C'], {
        item: 'mx-list-button-item',
        handles: true,
      });
      const [list] = result;
      list.addEventListener('reorder', (event) => {
        const { item, next } = event as ReorderEvent;
        item.toggleAttribute('disabled', true);
        // Later than the attribute's observer.
        setTimeout(() => {
          list.insertBefore(item, next);
        }, 50);
      });
      return result;
    }

    it('should be moved by an arrow key', async () => {
      const [list, [a]] = await createDisabling();

      handleOf(a!).focus();
      await userEvent.keyboard('{ArrowDown}');
      await expect.poll(() => order(list)).toEqual(['B', 'A', 'C']);
      await whenSettled(list, a!);

      expect(announcementOf(list)).toBe('Item 2 of 3.');
    });

    it('should be moved by a drop', async () => {
      const [list, [a, b]] = await createDisabling();

      await dragOnto(handleOf(a!), visualOf(b!));
      await expect.poll(() => order(list)).toEqual(['B', 'A', 'C']);
      await whenSettled(list, a!);

      expect(announcementOf(list)).toBe('Item 2 of 3.');
    });
  });

  it('should lift and move an item that is disabled between the press and the lift', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const events = recordReorders(list);
    const [x, y] = centerOf(handleOf(a!));

    await commands.pointerPress(x, y);
    await setDisabled(a!, true);
    await commands.pointerMove(x, y + 12, 3);
    const dragged = isDragged(a!);
    await commands.pointerMove(x, centerOf(visualOf(b!))[1] + 10, 8);
    await commands.pointerRelease();
    await whenSettled(list, a!);

    expect([dragged, events.length]).toEqual([true, 1]);
  });

  it('should go on with a pointer drag whose item is disabled', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C'], {
      item: 'mx-list-button-item',
      handles: true,
    });
    const events = recordReorders(list);
    const [x] = await lift(handleOf(a!));

    await setDisabled(a!, true);
    const dragged = isDragged(a!);
    await commands.pointerMove(x, centerOf(visualOf(b!))[1] + 10, 8);
    await commands.pointerRelease();
    await whenSettled(list, a!);

    expect([dragged, events.length]).toEqual([true, 1]);
  });

  it('should move an mx-list-item with the attribute', async () => {
    const [list, [a]] = await createList(['A', 'B', 'C'], { handles: true });
    commitOnReorder(list);
    await setDisabled(a!, true);

    handleOf(a!).focus();
    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);

    expect(order(list)).toEqual(['B', 'A', 'C']);
  });

  it('should not make an mx-list-item a tab stop again when the attribute is set after the page removed its tabindex', async () => {
    const [, [a]] = await createList(['A']);
    a!.removeAttribute('tabindex');
    await nextFrame();

    await setDisabled(a!, true);

    expect(a!.hasAttribute('tabindex')).toBe(false);
  });

  it('should write the semantics of an enabled handle on an mx-list-item with the attribute', async () => {
    const [, [a]] = await createList(['A'], { handles: true });

    await setDisabled(a!, true);

    expect(semantics(handleOf(a!))).toEqual(ENABLED);
  });
});

describe('mx-sortable-list values a consumer writes after the claim', () => {
  function moveIntoPlainList(item: HTMLElement): void {
    const plain = document.createElement('mx-list');
    document.body.append(plain);
    plain.append(item);
  }

  it("should keep a consumer's aria-label on a handle once the handle leaves", async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    const handle = handleOf(a!);
    handle.setAttribute('aria-label', 'Drag A');
    await nextFrame();
    handle.remove();
    await nextFrame();

    expect([written(handle), handle.getAttribute('aria-label')]).toEqual([
      ['aria-label'],
      'Drag A',
    ]);
  });

  it("should keep a consumer's tabindex and description on the host once it moves into mx-list", async () => {
    const [, [a]] = await createList(['A']);
    a!.setAttribute('tabindex', '-1');
    a!.setAttribute('aria-description', 'Mine');
    await nextFrame();
    moveIntoPlainList(a!);
    await nextFrame();

    expect([
      a!.getAttribute('tabindex'),
      a!.getAttribute('aria-description'),
    ]).toEqual(['-1', 'Mine']);
  });

  it("should keep a consumer's tabindex of the item's value on the host once it gains a handle", async () => {
    const [, [a]] = await createList(['A']);
    a!.setAttribute('tabindex', '0');
    await nextFrame();
    a!.prepend(createHandle());
    await nextFrame();

    expect([
      a!.getAttribute('tabindex'),
      a!.hasAttribute('aria-description'),
    ]).toEqual(['0', false]);
  });

  it("should keep a consumer's tabindex of the item's value as a tab stop in mx-list", async () => {
    const [, [a]] = await createList(['A']);
    a!.setAttribute('tabindex', '0');
    await nextFrame();
    moveIntoPlainList(a!);
    await nextFrame();
    const before = document.createElement('button');
    a!.parentElement!.before(before);
    a!.focus();
    const focused = document.activeElement === a;
    before.focus();
    await userEvent.tab();

    expect([focused, document.activeElement === a]).toEqual([true, true]);
  });

  it("should keep a consumer's write made in the same task as the release", async () => {
    const [, [a]] = await createList(['A']);
    a!.setAttribute('tabindex', '0');
    document.body.append(a!);
    await nextFrame();

    expect([
      a!.getAttribute('tabindex'),
      a!.hasAttribute('aria-description'),
    ]).toEqual(['0', false]);
  });

  it("should keep the description that the host forwards to a button item's control once it leaves", async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });
    a!.setAttribute('aria-description', 'Mine');
    await nextFrame();
    const forwarded = visualOf(a!).getAttribute('aria-description');
    document.body.append(a!);
    await nextFrame();

    expect([forwarded, visualOf(a!).getAttribute('aria-description')]).toEqual([
      'Mine',
      'Mine',
    ]);
  });

  // A reconnect forwards the host's `aria-*` to the control again, so this row
  // releases the control's record in place, by a handle.
  it("should keep the description that the host forwards to a button item's control once it gains a handle", async () => {
    const [, [a]] = await createList(['A'], { item: 'mx-list-button-item' });
    a!.setAttribute('aria-description', 'Mine');
    await nextFrame();
    a!.prepend(createHandle());
    await nextFrame();

    expect(visualOf(a!).getAttribute('aria-description')).toBe('Mine');
  });

  it("should describe a button item's control that loses the host's description in a move", async () => {
    const [list, [a]] = await createList(['A', 'B'], {
      item: 'mx-list-button-item',
    });
    a!.setAttribute('aria-description', 'Mine');
    await nextFrame();
    const forwarded = visualOf(a!).getAttribute('aria-description');
    a!.removeAttribute('aria-description');
    list.append(a!);
    await nextFrame();

    expect([forwarded, visualOf(a!).getAttribute('aria-description')]).toEqual([
      'Mine',
      DESCRIPTION,
    ]);
  });

  it('should not write again an attribute the consumer removed, before or at the release', async () => {
    const [, [a]] = await createList(['A']);
    a!.removeAttribute('tabindex');
    await nextFrame();
    const removed = a!.hasAttribute('tabindex');
    moveIntoPlainList(a!);
    await nextFrame();

    expect([
      removed,
      a!.hasAttribute('tabindex'),
      a!.hasAttribute('aria-description'),
    ]).toEqual([false, false, false]);
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

  it('should take focus on its host by Tab in mx-sortable-list', async () => {
    const a = await createStatic('mx-sortable-list');
    surround(a);

    await userEvent.tab();

    expect(document.activeElement).toBe(a);
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

    expect(document.activeElement).toBe(a);
  });

  it('should take focus by focus() in mx-sortable-list', async () => {
    const a = await createStatic('mx-sortable-list');

    a.focus();

    expect(document.activeElement).toBe(a);
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

describe('mx-sortable-list in a hidden iframe', () => {
  it('should sort once the iframe it connected in is shown', async () => {
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    const urls = [
      new URL('../../src/list/list-item.ts', import.meta.url).href,
      new URL('../../src/list/sortable-list.ts', import.meta.url).href,
    ];
    frame.srcdoc = `<script>window.errors = []; addEventListener('error', (event) => errors.push(event.message));</script>
<mx-sortable-list><mx-list-item>A</mx-list-item><mx-list-item>B</mx-list-item></mx-sortable-list>
<script type="module">
for (const url of ${JSON.stringify(urls)}) await import(url);
document.body.dataset.ready = '';
</script>`;
    document.body.append(frame);
    onTestFinished(() => frame.remove());
    await expect
      .poll(() => frame.contentDocument?.body.dataset['ready'], {
        timeout: 10_000,
      })
      .toBe('');
    frame.style.display = 'block';
    await nextFrame();
    await nextFrame();
    const list =
      frame.contentDocument!.querySelector<HTMLElement>('mx-sortable-list')!;
    const [a] = [...list.children] as HTMLElement[];
    commitOnReorder(list);

    a!.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => order(list)).toEqual(['B', 'A']);
    await whenSettled(list, a!);

    expect(
      (frame.contentWindow as Window & Readonly<{ errors: readonly string[] }>)
        .errors,
    ).toEqual([]);
  });
});

describe('mx-sortable-list definition order', () => {
  /**
   * Parses the markup in a fresh document, then evaluates the modules in the
   * given order, so each element upgrades with the markup already there.
   */
  async function parseThenDefine(
    modules: readonly string[],
    labels: readonly string[] = ['A'],
  ): Promise<readonly [HTMLIFrameElement, HTMLElement]> {
    const frame = document.createElement('iframe');
    frame.style.height = '400px';
    const urls = modules.map(
      (name) => new URL(`../../src/list/${name}`, import.meta.url).href,
    );
    const items = labels
      .map((label) => `<mx-list-item>${label}</mx-list-item>`)
      .join('');
    frame.srcdoc = `<mx-sortable-list style="--_drag-duration:0s">${items}</mx-sortable-list>
<script type="module">
for (const url of ${JSON.stringify(urls)}) await import(url);
document.body.dataset.ready = '';
</script>`;
    document.body.append(frame);
    onTestFinished(() => frame.remove());
    await expect
      .poll(() => frame.contentDocument?.body.dataset['ready'], {
        timeout: 10_000,
      })
      .toBe('');
    await nextFrame();
    return [frame, frame.contentDocument!.querySelector('mx-sortable-list')!];
  }

  /** Records each proposed move as `[from, to]` and commits it. */
  function recordMoves(list: HTMLElement): Array<readonly [number, number]> {
    const moves: Array<readonly [number, number]> = [];
    list.addEventListener('reorder', (event) => {
      const { item, next, from, to } = event as ReorderEvent;
      moves.push([from, to]);
      list.insertBefore(item, next);
    });
    return moves;
  }

  /** The center of `element` inside `frame`, in the test page's viewport. */
  function centerIn(
    frame: HTMLIFrameElement,
    element: HTMLElement,
  ): readonly [number, number] {
    const { left, top } = frame.getBoundingClientRect();
    const [x, y] = centerOf(element);
    return [left + frame.clientLeft + x, top + frame.clientTop + y];
  }

  async function moveByKeyboard(
    modules: readonly string[],
  ): Promise<ReadonlyArray<readonly [number, number]>> {
    const [, list] = await parseThenDefine(modules, ['A', 'B']);
    const moves = recordMoves(list);
    (list.firstElementChild as HTMLElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect.poll(() => moves.length).toBe(1);
    return moves;
  }

  async function moveByPointer(
    modules: readonly string[],
  ): Promise<ReadonlyArray<readonly [number, number]>> {
    const [frame, list] = await parseThenDefine(modules, ['A', 'B']);
    const moves = recordMoves(list);
    const [a, b] = [...list.children].map((item) =>
      visualOf(item as HTMLElement),
    );
    const [x, y] = centerIn(frame, a!);
    await commands.pointerPress(x, y);
    await commands.pointerMove(x, y + 12, 3);
    await commands.pointerMove(x, centerIn(frame, b!)[1] + 10, 8);
    await commands.pointerRelease();
    await expect.poll(() => moves.length).toBe(1);
    return moves;
  }

  it('should make a static item a tab stop when sortable-list.js is evaluated first', async () => {
    const [, list] = await parseThenDefine([
      'sortable-list.ts',
      'list-item.ts',
    ]);

    expect(
      visualOf(list.firstElementChild as HTMLElement).getAttribute('tabindex'),
    ).toBe('0');
  });

  it('should make a static item a tab stop when list-item.js is evaluated first', async () => {
    const [, list] = await parseThenDefine([
      'list-item.ts',
      'sortable-list.ts',
    ]);

    expect(
      visualOf(list.firstElementChild as HTMLElement).getAttribute('tabindex'),
    ).toBe('0');
  });

  it('should move a static item by keyboard when sortable-list.js is evaluated first', async () => {
    expect(await moveByKeyboard(['sortable-list.ts', 'list-item.ts'])).toEqual([
      [0, 1],
    ]);
  });

  it('should move a static item by keyboard when list-item.js is evaluated first', async () => {
    expect(await moveByKeyboard(['list-item.ts', 'sortable-list.ts'])).toEqual([
      [0, 1],
    ]);
  });

  it('should move a static item by pointer when sortable-list.js is evaluated first', async () => {
    expect(await moveByPointer(['sortable-list.ts', 'list-item.ts'])).toEqual([
      [0, 1],
    ]);
  });

  it('should move a static item by pointer when list-item.js is evaluated first', async () => {
    expect(await moveByPointer(['list-item.ts', 'sortable-list.ts'])).toEqual([
      [0, 1],
    ]);
  });
});

describe('mx-sortable-list announcement', () => {
  /** Moves the first of four items down one slot, for `commit` to answer. */
  async function moveFirst(
    commit: (event: ReorderEvent, list: HTMLElement) => void,
  ): Promise<HTMLElement> {
    const [list, [a]] = await createList(['A', 'B', 'C', 'D']);
    list.addEventListener('reorder', (event) => {
      commit(event as ReorderEvent, list);
    });
    a!.focus();

    await userEvent.keyboard('{ArrowDown}');
    await whenSettled(list, a!);
    return list;
  }

  it('should announce nothing when the consumer never commits', async () => {
    const list = await moveFirst(() => {});

    expect([order(list), announcementOf(list)]).toEqual([
      ['A', 'B', 'C', 'D'],
      '',
    ]);
  });

  it('should announce nothing for a pointer drop the consumer never commits', async () => {
    const [list, [a, b]] = await createList(['A', 'B', 'C']);

    await dragOnto(visualOf(a!), visualOf(b!));
    await whenSettled(list, a!);

    expect(announcementOf(list)).toBe('');
  });

  it("should announce the item's position when the consumer commits at another slot", async () => {
    const list = await moveFirst(({ item }, target) => {
      target.append(item);
    });

    expect(announcementOf(list)).toBe('Item 4 of 4.');
  });

  it("should announce the item's position when the consumer commits at another slot later", async () => {
    const list = await moveFirst(({ item }, target) => {
      setTimeout(() => {
        target.append(item);
      }, 100);
    });

    expect(announcementOf(list)).toBe('Item 4 of 4.');
  });

  it('should announce nothing when the consumer commits after the bound', async () => {
    const list = await moveFirst(({ item, next }, target) => {
      setTimeout(() => {
        target.insertBefore(item, next);
      }, 1500);
    });
    const atTheBound = order(list);
    await expect
      .poll(() => order(list), { timeout: 3000 })
      .toEqual(['B', 'A', 'C', 'D']);
    await nextFrame();

    expect([atTheBound, announcementOf(list)]).toEqual([
      ['A', 'B', 'C', 'D'],
      '',
    ]);
  });

  it('should announce nothing when the consumer removes the item', async () => {
    // drag reports that the landing has no placeholder beside the removed item.
    const report = vi.spyOn(window, 'reportError').mockImplementation(() => {});
    onTestFinished(() => report.mockRestore());
    const list = await moveFirst(({ item }) => {
      item.remove();
    });

    expect(announcementOf(list)).toBe('');
  });

  it('should style the region without a style attribute', async () => {
    const [list] = await createList([]);

    expect(
      list.shadowRoot!.querySelector('[aria-live]')!.hasAttribute('style'),
    ).toBe(false);
  });
});

describe('mx-sortable-list when other items change during the commit wait', () => {
  type ChangeCase = Readonly<{
    name: string;
    /** The index of the item that moves down one slot in A, B, C, D. */
    index: number;
    respond: (
      event: ReorderEvent,
      list: HTMLElement,
      items: readonly HTMLElement[],
    ) => void;
    announcement: string;
    /** Whether the wait ends before the 500 ms bound. */
    early: boolean;
  }>;

  function insertFirst(list: HTMLElement): void {
    list.prepend(createItem('mx-list-item', 'Z', false));
  }

  const CHANGES: readonly ChangeCase[] = [
    {
      name: 'an item is inserted and the move is not committed',
      index: 0,
      respond: (_, list) => {
        setTimeout(() => insertFirst(list), 50);
      },
      announcement: '',
      early: false,
    },
    {
      name: 'an item is inserted before the move is committed',
      index: 0,
      respond: ({ item, next }, list) => {
        setTimeout(() => insertFirst(list), 50);
        setTimeout(() => {
          list.insertBefore(item, next);
        }, 150);
      },
      announcement: 'Item 3 of 5.',
      early: true,
    },
    {
      name: 'an item is inserted in the task that commits the move',
      index: 0,
      respond: ({ item, next }, list) => {
        list.insertBefore(item, next);
        insertFirst(list);
      },
      announcement: 'Item 3 of 5.',
      early: true,
    },
    {
      name: 'another item is removed in the task that commits the move',
      index: 2,
      respond: ({ item, next }, list, [a]) => {
        setTimeout(() => {
          list.insertBefore(item, next);
          a!.remove();
        }, 50);
      },
      announcement: 'Item 3 of 3.',
      early: true,
    },
    {
      name: 'another item is removed before the move is committed',
      index: 2,
      respond: ({ item, next }, list, [a]) => {
        setTimeout(() => a!.remove(), 50);
        setTimeout(() => {
          list.insertBefore(item, next);
        }, 150);
      },
      announcement: 'Item 3 of 3.',
      early: true,
    },
    {
      name: 'the passed item is removed and the move is not committed',
      index: 0,
      respond: (_, _list, [, b]) => {
        setTimeout(() => b!.remove(), 50);
      },
      announcement: '',
      early: true,
    },
    {
      name: 'the item leaves and returns at the proposed slot',
      index: 1,
      respond: ({ item, next }, list) => {
        setTimeout(() => item.remove(), 50);
        setTimeout(() => {
          list.insertBefore(item, next);
        }, 150);
      },
      announcement: 'Item 3 of 4.',
      early: true,
    },
  ];

  /** Returns the announcement, and whether the wait ended before its bound. */
  async function moveDown({
    index,
    respond,
  }: ChangeCase): Promise<readonly [announcement: string, early: boolean]> {
    const [list, items] = await createList(['A', 'B', 'C', 'D']);
    const item = items[index]!;
    let proposed = Number.NaN;
    list.addEventListener('reorder', (event) => {
      proposed = performance.now();
      respond(event as ReorderEvent, list, items);
    });
    item.focus();

    await userEvent.keyboard('{ArrowDown}');
    await expect
      .poll(() => isDragged(item), { interval: 10, timeout: 2000 })
      .toBe(false);
    const early = performance.now() - proposed < 400;
    return [announcementOf(list), early];
  }

  it.each(CHANGES)(
    'should announce only a real move when $name',
    async (row) => {
      const [announcement] = await moveDown(row);

      expect(announcement).toBe(row.announcement);
    },
  );

  it.each(CHANGES)(
    'should end the wait only for the order of the proposed slot when $name',
    async (row) => {
      const [, early] = await moveDown(row);

      expect(early).toBe(row.early);
    },
  );
});

describe('mx-sortable-list scrollable overflow', () => {
  type ContainerCase = Readonly<{
    name: string;
    /** The styles of the boxes around the list, from the outermost. */
    boxes: readonly string[];
    /** The styles of the box before the list. */
    pad?: string;
    labels?: readonly string[];
    /** The list's own direction, where it differs from its containers'. */
    direction?: 'ltr' | 'rtl';
  }>;

  const CONTAINERS: readonly ContainerCase[] = [
    {
      name: 'an unpositioned scroll container',
      boxes: ['height: 200px; overflow: auto'],
    },
    {
      name: 'a scroll container in a transformed box',
      boxes: ['transform: translateX(0)', 'height: 200px; overflow: auto'],
    },
    {
      name: 'a scroll container in a fixed box',
      boxes: [
        'position: fixed; inset: 0 auto auto 0; width: 300px; height: 200px',
        'height: 200px; overflow: auto',
      ],
    },
    {
      name: 'an empty transformed box',
      boxes: ['width: 0; height: 0; transform: translateX(0)'],
      pad: 'height: 0',
      labels: [],
    },
    {
      name: 'a right-to-left scroll container in a transformed box',
      boxes: [
        'direction: rtl; transform: translateX(0)',
        'display: flex; width: 200px; overflow: auto',
      ],
      pad: 'flex: none; width: 3000px',
    },
    {
      name: 'a left-to-right scroll container of a right-to-left list in a transformed box',
      boxes: [
        'transform: translateX(0)',
        'display: flex; width: 200px; overflow: auto',
      ],
      pad: 'flex: none; width: 3000px',
      direction: 'rtl',
    },
  ];

  it.each(CONTAINERS)(
    'should not change the overflow of any ancestor in $name',
    async ({ boxes, pad = 'height: 3000px', labels = ['A'], direction }) => {
      const [list] = await createList(labels);
      list.dir = direction ?? '';
      let container: HTMLElement = document.body;

      for (const style of boxes) {
        const box = document.createElement('div');
        box.style.cssText = style;
        container.append(box);
        container = box;
      }

      const before = document.createElement('div');
      before.style.cssText = pad;
      container.append(before, list);
      await nextFrame();
      const measure = (): ReadonlyArray<readonly [number, number]> => {
        const extents: Array<readonly [number, number]> = [];

        for (
          let ancestor: HTMLElement | null = list;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          extents.push([ancestor.scrollWidth, ancestor.scrollHeight]);
        }

        return extents;
      };
      const withRegion = measure();
      list.shadowRoot!.querySelector('[aria-live]')!.remove();

      expect(withRegion).toEqual(measure());
    },
  );
});

describe('mx-sortable-list handle box', () => {
  it("should keep a page's display on a handle", async () => {
    const style = document.createElement('style');
    style.textContent = '[data-handle] { display: block; }';
    document.head.append(style);
    onTestFinished(() => style.remove());
    const [, [a]] = await createList(['A'], { handles: true });

    expect(getComputedStyle(handleOf(a!)).display).toBe('block');
  });

  it('should keep a hidden handle hidden', async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    handleOf(a!).hidden = true;

    expect(getComputedStyle(handleOf(a!)).display).toBe('none');
  });

  it('should keep the inline-grid box of a handle hidden until found', async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    handleOf(a!).setAttribute('hidden', 'until-found');

    expect(getComputedStyle(handleOf(a!)).display).toBe('inline-grid');
  });

  /** A list of one item whose handle in `slot` is a `tag` with an `mx-icon`. */
  const createIconHandle = async (
    tag: string,
    slot: string,
  ): Promise<HTMLElement> => {
    const [, [a]] = await createList(['A']);
    const handle = document.createElement(tag);
    const icon = document.createElement('mx-icon');
    icon.textContent = 'check';
    handle.append(icon);
    handle.dataset['handle'] = '';
    handle.slot = slot;
    a!.prepend(handle);
    await whenFontsReady();
    await nextFrame();
    return handle;
  };

  describe.each(['lead', 'trail'])('in %s', (slot) => {
    it.each(['span', 'button'])(
      'should center the mx-icon of a %s handle in its box',
      async (tag) => {
        const handle = await createIconHandle(tag, slot);
        const box = handle.getBoundingClientRect();
        const icon = handle.querySelector('mx-icon')!.getBoundingClientRect();
        const above = icon.top - box.top;
        const below = box.bottom - icon.bottom;

        expect(
          Math.abs(above - below),
          `${above} above, ${below} below`,
        ).toBeLessThanOrEqual(1);
      },
    );
  });

  it("should center the text of a bare mx-icon handle in lead in the icon's box", async () => {
    const [, [a]] = await createList(['A']);
    const icon = document.createElement('mx-icon');
    icon.textContent = 'check';
    icon.dataset['handle'] = '';
    icon.slot = 'lead';
    a!.prepend(icon);
    await whenFontsReady();
    await nextFrame();
    const range = document.createRange();
    range.selectNodeContents(icon);
    const text = range.getBoundingClientRect();
    const box = icon.getBoundingClientRect();
    const above = text.top - box.top;
    const below = box.bottom - text.bottom;

    expect(
      Math.abs(above - below),
      `${above} above, ${below} below`,
    ).toBeLessThanOrEqual(1);
  });

  it('should center the mx-icon of a span handle that the page sizes', async () => {
    const handle = await createIconHandle('span', 'lead');
    handle.style.inlineSize = '48px';
    handle.style.blockSize = '48px';
    await nextFrame();
    const box = handle.getBoundingClientRect();
    const icon = handle.querySelector('mx-icon')!.getBoundingClientRect();

    expect([
      Math.abs(icon.top - box.top - (box.bottom - icon.bottom)) <= 1,
      Math.abs(icon.left - box.left - (box.right - icon.right)) <= 1,
    ]).toEqual([true, true]);
  });

  it('should keep the text of a lead handle inside its box', async () => {
    const [, [a]] = await createList(['A'], { handles: true });
    await whenFontsReady();
    const handle = handleOf(a!);
    const range = document.createRange();
    range.selectNodeContents(handle);
    const text = range.getBoundingClientRect();
    const box = handle.getBoundingClientRect();

    expect([
      text.top >= box.top,
      text.bottom <= box.bottom,
      text.left >= box.left,
      text.right <= box.right,
    ]).toEqual([true, true, true, true]);
  });
});

describe.runIf(server.browser === 'chromium')('mx-sortable-list touch', () => {
  const STEPS = 8;

  const makeElement = (
    tag: string,
    ...content: ReadonlyArray<Node | string>
  ): HTMLElement => {
    const element = document.createElement(tag);
    element.append(...content);
    return element;
  };
  const icon = (): HTMLElement => makeElement('mx-icon', 'check');

  const HANDLES: ReadonlyArray<readonly [string, () => HTMLElement]> = [
    ['a span with text', () => makeElement('span', '≡')],
    ['an mx-icon', icon],
    ['a span with an mx-icon', () => makeElement('span', icon())],
    ['an mx-icon-button', () => makeElement('mx-icon-button', icon())],
    ['a native button with an mx-icon', () => makeElement('button', icon())],
  ];

  /**
   * A list whose items have the handle that `create` makes, in `slot`, on a
   * page that scrolls.
   */
  const createTouchList = async (
    create: (() => HTMLElement) | null,
    slot = 'lead',
    item: ItemTag = 'mx-list-item',
  ): Promise<readonly [HTMLElement, readonly HTMLElement[]]> => {
    const [list, items] = await createList(['A', 'B', 'C'], { item });

    if (create) {
      for (const element of items) {
        const handle = create();
        handle.dataset['handle'] = '';
        handle.slot = slot;
        element.prepend(handle);
      }
    }

    const spacer = document.createElement('div');
    spacer.style.blockSize = '3000px';
    document.body.append(spacer);
    await nextFrame();
    return [list, items];
  };

  /** The handle's box: an `mx-icon-button`'s button, or the handle itself. */
  const boxOf = (handle: HTMLElement): HTMLElement =>
    handle.shadowRoot?.querySelector<HTMLElement>('.host') ?? handle;

  /**
   * Touches `target`'s center, moves the finger to 10 px below the center of
   * `over`, and lifts it.
   */
  const swipe = async (
    target: HTMLElement,
    over: HTMLElement,
  ): Promise<void> => {
    const [x, y] = centerOf(target);
    const [, toY] = centerOf(over);

    await commands.touch('touchStart', [x, y]);
    await nextFrame();

    for (let i = 1; i <= STEPS; i += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one move at a time
      await commands.touch('touchMove', [x, y + ((toY + 10 - y) * i) / STEPS]);
      // oxlint-disable-next-line no-await-in-loop -- one move at a time
      await nextFrame();
    }

    await commands.touch('touchEnd');
    await nextFrame();
  };

  afterEach(async () => {
    // A row that fails mid-gesture leaves the finger down.
    await commands.touch('touchCancel').catch(() => {});
    window.scrollTo(0, 0);
  });

  describe.each(['lead', 'trail'])('in %s', (slot) => {
    it.each(HANDLES)(
      'should propose a move in a touch drag by %s',
      async (_, create) => {
        const [list, [a, b]] = await createTouchList(create, slot);
        const events = recordReorders(list);

        await swipe(boxOf(handleOf(a!)), visualOf(b!));

        expect(events.map(({ item }) => item)).toEqual([a]);
      },
    );
  });

  it.each(['mx-list-item', 'mx-list-button-item'] as const)(
    'should propose nothing in a swipe on %s without a handle',
    async (tag) => {
      const [list, [a, b]] = await createTouchList(null, 'lead', tag);
      const events = recordReorders(list);

      await swipe(visualOf(a!), visualOf(b!));

      expect(events).toEqual([]);
    },
  );
});
