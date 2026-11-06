/** `drag:DRI-9`: release order and cleanup. */
import { describe, expect, it } from 'vitest';
import { lift } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  commands,
  dragAndDrop,
  faultMessages,
  frames,
  grab,
  log,
  makeList,
  managed,
  onCleanup,
  order,
  release,
  targetOf,
} from './support/harness.ts';

const stateOf = (element: HTMLElement) => ({
  style: element.getAttribute('style'),
  popover: element.getAttribute('popover'),
  open: element.matches(':popover-open'),
});

describe('drag:DRI-9 release order', () => {
  it('should release in the fixed order', async () => {
    const list = makeList(3);
    const row = document.querySelector<HTMLElement>('#r0')!;
    let dragSignal: AbortSignal | null = null;

    managed(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        dragSignal = drag.signal;
        drag.use((outcome) => {
          log.push(
            `dispose:${outcome?.type}:signal=${dragSignal!.aborted}:lifted=${row.matches(':popover-open')}`,
          );
        });
      },
      settle() {
        log.push(`settle:signal=${dragSignal!.aborted}`);
        return { x: 300, y: 300, duration: 50 };
      },
      end() {
        log.push(
          `end:lifted=${row.matches(':popover-open')}:animations=${row.getAnimations().length}`,
        );
      },
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual([
      'settle:signal=false',
      'dispose:skipped:signal=true:lifted=true',
      'end:lifted=false:animations=2',
    ]);
  });

  it('should run the terminal in the task of the decision, before the landing ends', async () => {
    const list = makeList(4);
    const landed: string[] = [];

    basicSortable(list, {
      landing: landing({ duration: 500 }),
      onEnd() {
        const row = document.querySelector<HTMLElement>('#r0')!;

        landed.push(
          `open=${row.matches(':popover-open')} placeholder=${Boolean(list.querySelector('[data-drag-placeholder]'))} animating=${row.getAnimations().length > 0}`,
        );
      },
    });
    await grab('#r0', 0, 90);
    await commands.pointerUp();
    expect(landed).toEqual(['open=false placeholder=false animating=true']);
  });

  it.each(['accepted', 'rejected', 'canceled'] as const)(
    'should restore inline styles and popover state exactly on a drop that is %s',
    async (kind) => {
      const list = makeList(4);
      const row = document.querySelector<HTMLElement>('#r0')!;

      row.style.cssText =
        'height:40px;touch-action:none;margin-left:8px;color:rgb(1, 2, 3) !important;--own:1;transform:translateX(0px)';
      row.setAttribute('popover', 'hint');

      const before = stateOf(row);

      basicSortable(list, {
        onReorder({ item, next }) {
          if (kind === 'rejected') {
            return ReorderResolution.reject('no');
          }

          list.insertBefore(item, next);
          return ReorderResolution.accept();
        },
      });
      await grab(row, 0, 90);

      if (kind === 'canceled') {
        await commands.keyPress('Escape');
      }

      await release();
      expect(stateOf(row)).toEqual(before);
    },
  );

  it('should leave no style attribute when there was none', async () => {
    const list = makeList(3);
    const row = document.createElement('div');

    row.id = 'bare';
    row.textContent = 'Bare';
    list.prepend(row);
    expect(row.hasAttribute('style')).toBe(false);
    basicSortable(list);
    await dragAndDrop(row, 45);
    expect(order(list).split(',').indexOf('bare')).toBe(1);
    expect(row.hasAttribute('style')).toBe(false);
  });

  it('should restore an open popover the page had', async () => {
    const list = makeList(3);
    const row = document.querySelector<HTMLElement>('#r0')!;

    row.setAttribute('popover', 'manual');
    row.style.cssText += ';position:static;inset:auto;margin:0';
    row.showPopover();

    basicSortable(list, {
      onReorder: () => ReorderResolution.reject('no'),
    });
    await dragAndDrop(row, 45);
    expect(row.matches(':popover-open')).toBe(true);
    expect(row.getAttribute('popover')).toBe('manual');
    row.hidePopover();
  });

  it('should pass each outcome to a disposer', async () => {
    const list = makeList(3);
    const outcomes: unknown[] = [];

    managed<undefined, string>(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use((outcome) => {
          outcomes.push(outcome);
        });
      },
      drop: (drag) =>
        drag.item.id === 'r0'
          ? () => 'verdict'
          : drag.item.id === 'r1'
            ? null
            : () => {
                throw new Error('fault');
              },
    });
    await dragAndDrop('#r0', 30);
    await dragAndDrop('#r1', 30);
    await grab('#r2');
    await commands.keyPress('Escape');
    await release();
    expect(outcomes.map((outcome) => (outcome as { type: string }).type)).toEqual(
      ['verdict', 'skipped', 'canceled'],
    );
  });

  it('should run disposers last in first out, past a throw', async () => {
    const list = makeList(3);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        drag.use(() => {
          log.push('first added');
        });
        drag.use(() => {
          throw new Error('middle');
        });
        drag.use(() => {
          log.push('last added');
        });
      },
    });
    await dragAndDrop('#r0', 30);
    expect(log).toEqual(['last added', 'first added']);
    expect(faultMessages()).toEqual(['middle']);
  });

  it('should run a late use at once with the outcome', async () => {
    const list = makeList(3);
    const seen: unknown[] = [];
    let retained: { use(dispose: (outcome: unknown) => void): void } | null =
      null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      start(drag) {
        retained = drag;
      },
    });
    await dragAndDrop('#r0', 30);
    retained!.use((outcome) => {
      seen.push(outcome);
    });
    expect(seen).toEqual([{ type: 'skipped' }]);
  });

  it('should report a throw from a late use', async () => {
    const list = makeList(3);
    let retained: { use(dispose: () => void): void } | null = null;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      start(drag) {
        retained = drag;
      },
    });
    await dragAndDrop('#r0', 30);
    retained!.use(() => {
      throw new Error('late');
    });
    expect(faultMessages()).toEqual(['late']);
  });

  it('should run a late use on a destroyed controller at once', async () => {
    const panel = managed(makeList(1), { admit: () => null });

    await panel.requestDestroy();
    panel.use(() => {
      log.push('ran');
    });
    expect(log).toEqual(['ran']);
  });

  it('should leave no placeholder, capture, listener or style after an operation', async () => {
    const list = makeList(3);
    let moves = 0;

    managed(list, {
      lift,
      admit: (event) => ({ item: targetOf(event) }),
      move() {
        moves += 1;
      },
    });
    await dragAndDrop('#r0', 30);
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();

    const count = moves;

    await commands.pointerMove(400, 400);
    await frames();
    expect(moves).toBe(count);
    expect(list.hasPointerCapture(1)).toBe(false);
  });

  it('should not retain the signal past a press that never activates', async () => {
    const list = makeList(2);

    onCleanup(() => {});
    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      end: () => {
        log.push('end');
      },
    });

    const row = document.querySelector('#r0')!;
    const { x, y } = row.getBoundingClientRect();

    await commands.pointerMove(x + 5, y + 5);
    await commands.pointerDown();
    await commands.pointerUp();
    await commands.pointerMove(x + 5, y + 60, 3);
    await frames();
    expect(log).toEqual([]);
  });
});
