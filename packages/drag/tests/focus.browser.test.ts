/** `drag:DRI-12`: focus. */
import { describe, expect, it } from 'vitest';
import { lift } from '../src/lift.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  engine,
  frames,
  grab,
  log,
  makeList,
  managed,
  order,
  press,
  release,
  rowsOf,
} from './support/harness.ts';

function focusableList(count: number, parent?: ParentNode & Node): HTMLElement {
  const list = makeList(count, parent);

  for (const row of rowsOf(list)) {
    row.tabIndex = 0;
  }

  return list;
}

const row = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`#${id}`)!;

describe('drag:DRI-12 focus', () => {
  it('should let two arrow presses in a row reorder twice', async () => {
    const list = focusableList(4);

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r2,r0,r3');
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should keep focus through a pointer reorder', async () => {
    const list = focusableList(4);

    basicSortable(list);
    row('r0').focus();
    await dragAndDrop('#r0', 90);
    expect(order(list)).toBe('r1,r2,r0,r3');
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should restore focus after an async verdict', async () => {
    const list = focusableList(4);

    basicSortable(list, {
      async onReorder({ item, next }) {
        await frames(1);
        list.insertBefore(item, next);
        return ReorderResolution.accept();
      },
    });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames(4);
    expect(order(list)).toBe('r1,r0,r2,r3');
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should leave focus where the user moved it during a verdict', async () => {
    const list = focusableList(4);
    const other = document.createElement('button');
    let finish: ((value: ReorderResolution) => void) | null = null;

    document.body.append(other);
    basicSortable(list, {
      onReorder({ item, next }) {
        list.insertBefore(item, next);
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    other.focus();
    finish!(ReorderResolution.accept());
    await frames();
    expect(document.activeElement).toBe(other);
  });

  it('should restore focus inside an open shadow root', async () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });

    document.body.append(host);

    const list = focusableList(3, root);
    const inner = list.querySelector<HTMLElement>('#r0')!;

    basicSortable(list);
    inner.focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r0,r2');
    expect(root.activeElement).toBe(inner);
  });

  it('should restore focus to a descendant of the item', async () => {
    const list = makeList(3);
    const input = document.createElement('input');

    row('r0').append(input);
    basicSortable(list);
    input.focus();

    const { x, y } = row('r0').getBoundingClientRect();

    await commands.pointerMove(x + 150, y + 15);
    await commands.pointerDown();
    input.focus();
    await commands.pointerMove(x + 150, y + 60, 3);
    await frames();
    await commands.pointerMove(x + 150, y + 90, 3);
    await frames();
    await release();
    expect(order(list)).toBe('r1,r2,r0');
    expect(document.activeElement).toBe(input);
  });

  it('should keep focus when the lift promotes an autofocus descendant', async () => {
    const list = makeList(3);
    const input = document.createElement('input');
    const other = document.createElement('button');

    input.autofocus = true;
    input.style.cssText = 'width:20px;float:right';
    row('r0').append(input);
    document.body.append(other);
    basicSortable(list);

    const { x, y } = await press('#r0');

    other.focus();
    await commands.pointerMove(x, y + 20, 2);
    expect(document.activeElement).toBe(other);
    await commands.keyPress('Escape');
  });

  it('should leave nothing focused when an autofocus descendant is promoted with nothing focused', async () => {
    const list = makeList(3);
    const input = document.createElement('input');

    input.autofocus = true;
    input.style.cssText = 'width:20px;float:right';
    row('r0').append(input);
    managed(list, {
      lift,
      admit: () => ({ item: row('r0') }),
    });
    await grab('#r0', 0, 20);
    expect(document.activeElement).toBe(document.body);
    await commands.keyPress('Escape');
  });

  it('should not restore focus on destruction', async () => {
    const list = focusableList(3);
    const controller = basicSortable(list, {
      onReorder: () => new Promise<ReorderResolution>(() => {}),
    });

    row('r0').focus();
    await commands.keyPress('ArrowDown');
    list.append(row('r0'));
    expect(document.activeElement).toBe(document.body);
    await controller.requestDestroy();
    expect(document.activeElement).toBe(document.body);
  });

  it('should not scroll on a pointer restore', async () => {
    const scroller = document.createElement('div');

    scroller.style.cssText = 'height:200px;overflow:auto';
    document.body.append(scroller);

    const list = focusableList(30, scroller);

    basicSortable(list, {
      onReorder({ item }) {
        // The consumer sends the row far off-screen.
        list.append(item);
        return ReorderResolution.accept();
      },
    });
    row('r0').focus();
    await grab('#r0', 0, 90);
    scroller.scrollTop = 0;
    await commands.pointerUp();
    await frames();
    expect(document.activeElement).toBe(row('r0'));
    expect(scroller.scrollTop).toBe(0);
  });

  it('should scroll a keyboard restore of an off-screen row into view', async () => {
    const scroller = document.createElement('div');

    scroller.style.cssText = 'height:200px;overflow:auto';
    document.body.append(scroller);

    const list = focusableList(30, scroller);

    basicSortable(list, {
      onReorder({ item }) {
        list.append(item);
        return ReorderResolution.accept();
      },
    });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(document.activeElement).toBe(row('r0'));
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it('should report :focus-visible per engine after a restore', async () => {
    const list = focusableList(3);

    basicSortable(list);
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();

    const visible = row('r0').matches(':focus-visible');

    // An observation, kept in the report's table for each engine.
    log.push(`${engine}:${visible}`);
    expect(typeof visible).toBe('boolean');
  });
});
