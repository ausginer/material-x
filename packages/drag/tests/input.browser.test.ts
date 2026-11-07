/**
 * `drag:DRI-19` and `drag:DRI-4`: an operation's input can't be hidden by the
 * page, a press never activates without its button, one event drives one
 * operation across nested roots, and `Escape` that decides a started operation
 * is consumed.
 */
import { describe, expect, it } from 'vitest';
import { y } from '../src/sortable/y.ts';
import { ReorderResolution, sortable } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  dragAndDrop,
  frames,
  grab,
  log,
  makeList,
  onCleanup,
  order,
  press,
  release,
  rowsOf,
} from './support/harness.ts';

/** Stops `type` at `target` in the bubble phase, for this test. */
function stopAt(target: EventTarget, type: string): void {
  const listening = new AbortController();

  onCleanup(() => {
    listening.abort();
  });
  target.addEventListener(
    type,
    (event) => {
      event.stopPropagation();
    },
    { signal: listening.signal },
  );
}

/** A press and release below the threshold, then a hover with no button. */
async function clickThenHover(target: string): Promise<void> {
  const { x, y: top } = await press(target);

  await commands.pointerUp();
  await commands.pointerMove(x, top + 60, 4);
  await frames();
}

const isLifted = (element: Element): boolean =>
  element.matches(':popover-open');

describe('drag:DRI-19 input ownership', () => {
  it('should not activate on a hover after a pointerup stopped on a child, and reorder at the next press', async () => {
    const list = makeList(4);
    const child = document.createElement('span');

    child.id = 'child';
    child.textContent = 'grip';
    list.querySelector('#r0')!.append(child);
    stopAt(child, 'pointerup');
    basicSortable(list);
    await clickThenHover('#child');
    expect(log).toEqual([]);
    expect(isLifted(list.querySelector('#r0')!)).toBe(false);
    await dragAndDrop('#r1', 90);
    expect(order(list)).toBe('r0,r2,r3,r1');
  });

  it('should not activate on a hover after a pointerup stopped on an ancestor of the root, and reorder at the next press', async () => {
    const wrapper = document.createElement('div');

    document.body.append(wrapper);

    const list = makeList(4, wrapper);

    stopAt(wrapper, 'pointerup');
    basicSortable(list);
    await clickThenHover('#r0');
    expect(log).toEqual([]);
    expect(isLifted(list.querySelector('#r0')!)).toBe(false);
    await dragAndDrop('#r1', 90);
    expect(order(list)).toBe('r0,r2,r3,r1');
  });

  it('should end a press whose release the window never saw at the next sample with no button', async () => {
    const list = makeList(4);
    const listening = new AbortController();

    // Registered before the press, so it runs before the kernel's listener and
    // hides the release from it, as a release outside the window does.
    addEventListener(
      'pointerup',
      (event) => {
        event.stopImmediatePropagation();
      },
      { capture: true, signal: listening.signal },
    );
    onCleanup(() => {
      listening.abort();
    });
    basicSortable(list);
    await clickThenHover('#r0');
    listening.abort();
    expect(log).toEqual([]);
    expect(isLifted(list.querySelector('#r0')!)).toBe(false);
    await dragAndDrop('#r1', 90);
    expect(order(list)).toBe('r0,r2,r3,r1');
  });

  it('should admit a primary press while a press whose release was missed is pending', async () => {
    const list = makeList(4);
    const listening = new AbortController();
    const hide = (event: Event): void => {
      event.stopImmediatePropagation();
    };

    onCleanup(() => {
      listening.abort();
    });
    basicSortable(list);
    await press('#r0');
    // The release and the move to the next row never reach the window's
    // listeners, so the next press arrives while the first is still pending.
    addEventListener('pointerup', hide, {
      capture: true,
      signal: listening.signal,
    });
    addEventListener('pointermove', hide, {
      capture: true,
      signal: listening.signal,
    });
    await commands.pointerUp();

    const next = centerOf('#r1');

    await commands.pointerMove(next.x, next.y);
    listening.abort();
    await commands.pointerDown();
    await commands.pointerMove(next.x, next.y + 45, 2);
    await commands.pointerMove(next.x, next.y + 90, 2);
    await frames();
    await release();
    expect(order(list)).toBe('r0,r2,r3,r1');
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('should keep an active drag following the pointer when the page stops pointermove', async () => {
    const wrapper = document.createElement('div');

    document.body.append(wrapper);

    const list = makeList(4, wrapper);

    stopAt(wrapper, 'pointermove');
    stopAt(list, 'pointermove');
    basicSortable(list);

    const start = centerOf('#r0');

    await grab('#r0', 0, 90);
    expect(centerOf('#r0').y).toBeCloseTo(start.y + 90, 0);
    await release();
    expect(order(list)).toBe('r1,r2,r0,r3');
  });

  it('should ignore a second pointer moving during a drag', async () => {
    const list = makeList(3);

    basicSortable(list);

    const start = centerOf('#r0');

    await grab('#r0', 0, 40);
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 77,
        clientX: start.x + 300,
        clientY: start.y + 300,
        buttons: 1,
        bubbles: true,
      }),
    );
    expect(centerOf('#r0').y).toBeCloseTo(start.y + 40, 0);
    expect(centerOf('#r0').x).toBeCloseTo(start.x, 0);
    await release();
    expect(log).toEqual(['start', 'end:accepted']);
  });

  it('should reorder links marked draggable="false"', async () => {
    const list = document.createElement('div');

    list.style.cssText = 'width:200px';

    for (let i = 0; i < 4; i += 1) {
      const link = document.createElement('a');

      link.id = `r${i}`;
      link.href = `#link-${i}`;
      link.draggable = false;
      link.textContent = `Link ${i}`;
      link.style.cssText =
        'display:block;height:40px;touch-action:none;user-select:none';
      list.append(link);
    }

    document.body.append(list);
    basicSortable(list);
    await dragAndDrop('#r0', 90);
    expect(order(list)).toBe('r1,r2,r0,r3');
    expect(location.hash).toBe('');
  });
});

/** A board: a sortable of columns, each with a header and a sortable of cards. */
function makeBoard(): Readonly<{
  board: HTMLElement;
  columns: readonly HTMLElement[];
  cards: readonly HTMLElement[];
}> {
  const board = document.createElement('div');
  const columns: HTMLElement[] = [];
  const cards: HTMLElement[] = [];

  board.id = 'board';
  board.style.cssText = 'width:240px';

  for (let c = 0; c < 2; c += 1) {
    const column = document.createElement('div');
    const header = document.createElement('div');
    const list = document.createElement('div');

    column.id = `col${c}`;
    column.className = 'column';
    header.id = `head${c}`;
    header.textContent = `Column ${c}`;
    header.style.cssText = 'height:30px;touch-action:none;user-select:none';
    list.className = 'cards';

    for (let i = 0; i < 3; i += 1) {
      const card = document.createElement('div');

      card.id = `card${c}${i}`;
      card.tabIndex = 0;
      card.textContent = `Card ${c}${i}`;
      card.style.cssText = 'height:40px;touch-action:none;user-select:none';
      list.append(card);
    }

    column.append(header, list);
    board.append(column);
    columns.push(column);
    cards.push(list);
  }

  document.body.append(board);
  return { board, columns, cards };
}

function sortableOf(root: HTMLElement, name: string): void {
  const controller = sortable(root, {
    items: () =>
      [...root.children].filter(
        (element) => !element.hasAttribute('data-drag-placeholder'),
      ) as HTMLElement[],
    axis: y(),
    onStart(item) {
      log.push(`${name}:start:${item.id}`);
    },
    onReorder({ item, next }) {
      root.insertBefore(item, next);
      return ReorderResolution.accept();
    },
    onEnd(result) {
      log.push(`${name}:end:${result.type}`);
    },
  });

  onCleanup(() => controller.requestDestroy());
}

const ids = (root: Element): string =>
  [...root.children]
    .filter((element) => !element.hasAttribute('data-drag-placeholder'))
    .map((element) => element.id)
    .join();

describe('drag:DRI-19 nested roots', () => {
  it('should reorder the inner list only, with no attribute', async () => {
    const { board, cards } = makeBoard();

    // Inner roots first, as a framework mounts children before parents.
    sortableOf(cards[0]!, 'inner');
    sortableOf(board, 'outer');
    await dragAndDrop('#card00', 50);
    expect(ids(cards[0]!)).toBe('card01,card00,card02');
    expect(ids(board)).toBe('col0,col1');
    expect(log).toEqual(['inner:start:card00', 'inner:end:accepted']);
  });

  it('should move a column from its header', async () => {
    const { board, cards } = makeBoard();

    sortableOf(cards[0]!, 'inner');
    sortableOf(board, 'outer');
    await dragAndDrop('#head0', 200);
    expect(ids(board)).toBe('col1,col0');
    expect(log).toEqual(['outer:start:col0', 'outer:end:accepted']);
  });

  it('should run a keyboard command on the inner list only', async () => {
    const { board, cards } = makeBoard();

    sortableOf(cards[0]!, 'inner');
    sortableOf(board, 'outer');
    document.querySelector<HTMLElement>('#card00')!.focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(ids(cards[0]!)).toBe('card01,card00,card02');
    expect(ids(board)).toBe('col0,col1');
  });
});

describe('drag:DRI-4 Escape', () => {
  it('should cancel and keep a modal dialog open', async () => {
    const dialog = document.createElement('dialog');

    document.body.append(dialog);

    const list = makeList(3, dialog);

    dialog.showModal();
    onCleanup(() => {
      dialog.close();
    });
    basicSortable(list);
    await grab('#r0');
    await commands.keyPress('Escape');
    await frames();
    expect(dialog.open).toBe(true);
    expect(log).toEqual(['start', 'end:canceled']);
    await commands.pointerUp();
  });

  it('should cancel and keep an auto popover open', async () => {
    const popover = document.createElement('div');

    popover.popover = 'auto';
    popover.style.cssText = 'margin:0;inset:0 auto auto 0;padding:0';
    document.body.append(popover);

    const list = makeList(3, popover);

    popover.showPopover();
    onCleanup(() => {
      if (popover.matches(':popover-open')) {
        popover.hidePopover();
      }
    });
    basicSortable(list);
    await grab('#r0');
    await commands.keyPress('Escape');
    await frames();
    expect(popover.matches(':popover-open')).toBe(true);
    expect(log).toEqual(['start', 'end:canceled']);
    await commands.pointerUp();
  });

  it('should cancel a pending verdict and keep a modal dialog open', async () => {
    const dialog = document.createElement('dialog');

    document.body.append(dialog);

    const list = makeList(3, dialog);

    dialog.showModal();
    onCleanup(() => {
      dialog.close();
    });
    basicSortable(list, {
      onReorder: () => new Promise<ReorderResolution>(() => {}),
    });
    await grab('#r0', 0, 50);
    await release();
    await commands.keyPress('Escape');
    await frames();
    expect(dialog.open).toBe(true);
    expect(log).toEqual(['start', 'end:canceled']);
  });

  it('should not prevent Escape before start', async () => {
    const list = makeList(3);
    const prevented: boolean[] = [];
    const listening = new AbortController();

    onCleanup(() => {
      listening.abort();
    });
    document.addEventListener(
      'keydown',
      (event) => {
        prevented.push(event.defaultPrevented);
      },
      { signal: listening.signal },
    );
    basicSortable(list);
    await press('#r0');
    await commands.keyPress('Escape');
    await commands.pointerUp();
    expect(prevented).toEqual([false]);
    expect(log).toEqual([]);
    expect(rowsOf(list)).toHaveLength(3);
  });
});
