/**
 * `drag:DRI-9` and `drag:DRI-12`: the end of an operation runs release, the
 * landing, `end`, and then the focus restore, which also follows an `end` that
 * throws or requests destruction.
 */
import { describe, expect, it } from 'vitest';
import type {
  BehaviorOperation,
  DraggableController,
} from '../src/draggable.ts';
import { landing } from '../src/sortable/landing.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  faultMessages,
  frames,
  log,
  makeList,
  managed,
  onCleanup,
  order,
  rowsOf,
} from './support/harness.ts';

function focusableList(count: number): HTMLElement {
  const list = makeList(count);

  for (const row of rowsOf(list)) {
    row.tabIndex = 0;
  }

  return list;
}

const row = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`#${id}`)!;

/**
 * A keyboard behavior with no lift that moves its item one slot down in `end`.
 * `afterMove` runs in `end` after the move.
 */
function reorderInEnd(
  list: HTMLElement,
  afterMove: (controller: DraggableController<unknown>) => void = () => {},
  extra: (item: HTMLElement) => BehaviorOperation = () => ({}),
): DraggableController<unknown> {
  const controller: DraggableController<unknown> = managed(list, {
    admit: () => null,
    command(event) {
      const item = event.target as HTMLElement;

      return event.key === 'ArrowDown' && item.nextElementSibling
        ? { item }
        : null;
    },
    activate: (drag) => ({
      end() {
        drag.item.nextElementSibling!.after(drag.item);
        log.push('end');
        afterMove(controller);
      },
      ...extra(drag.item),
    }),
  });

  return controller;
}

describe('drag:DRI-9 and drag:DRI-12 release order', () => {
  it('should start the landing before the focus call', async () => {
    const list = focusableList(4);
    const seen: number[] = [];
    const { focus: nativeFocus } = HTMLElement.prototype;

    onCleanup(() => {
      HTMLElement.prototype.focus = nativeFocus;
    });
    basicSortable(list, { landing: landing({ duration: 500 }) });
    row('r0').focus();
    HTMLElement.prototype.focus = function focus(
      this: HTMLElement,
      options?: FocusOptions,
    ): void {
      seen.push(this.getAnimations().length);
      nativeFocus.call(this, options);
    };
    await dragAndDrop('#r0', 90);
    HTMLElement.prototype.focus = nativeFocus;
    expect(order(list)).toBe('r1,r2,r0,r3');
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBeGreaterThan(0);
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should keep focus through two arrow presses that reorder in end', async () => {
    const list = focusableList(4);

    reorderInEnd(list);
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r2,r0,r3');
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should restore focus when end throws', async () => {
    const list = focusableList(3);

    reorderInEnd(list, () => {
      throw new Error('end throws');
    });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r0,r2');
    expect(faultMessages()).toEqual(['end throws']);
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should restore focus when end requests destruction', async () => {
    const list = focusableList(3);

    reorderInEnd(list, (controller) => {
      void controller.requestDestroy();
    });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r0,r2');
    expect(document.activeElement).toBe(row('r0'));
  });

  it('should not restore focus when destruction is requested before the terminal', async () => {
    const list = focusableList(3);
    let controller: DraggableController<unknown> | null = null;

    controller = reorderInEnd(list, undefined, (item) => ({
      drop() {
        // The reorder happens in the verdict, so focus goes to `body`.
        item.nextElementSibling!.after(item);
        return null;
      },
      settle() {
        void controller!.requestDestroy();
      },
    }));
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(order(list)).toBe('r1,r0,r2');
    expect(log).toEqual([]);
    expect(document.activeElement).toBe(document.body);
  });
});
