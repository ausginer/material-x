/**
 * `drag:DRI-3`, `drag:DRI-13`, `drag:DRI-14`, `drag:DRI-15` and `drag:DRI-17`:
 * activation declines quietly for a disconnected item or a command that is no
 * longer possible, a grab during a landing keeps the visual under the pointer,
 * the placeholder faults name themselves, and samples coalesce to one frame.
 */
import { describe, expect, it } from 'vitest';
import { Lifter } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  faultMessages,
  faults,
  frames,
  grab,
  log,
  makeList,
  managed,
  moveHeld,
  onCleanup,
  order,
  press,
  ReactionProbe,
  release,
  rowsOf,
  targetOf,
  wait,
} from './support/harness.ts';

const row = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`#${id}`)!;

/** Runs `act` once, the first time `element`'s popover opens. */
function onFirstOpen(element: HTMLElement, act: () => void): void {
  let armed = true;

  element.addEventListener('beforetoggle', (event) => {
    if (armed && event.newState === 'open') {
      armed = false;
      act();
    }
  });
}

describe('drag:DRI-3 activation', () => {
  it('should run no hook for a custom behavior whose item was disconnected during the press', async () => {
    const list = makeList(3);

    const lifter = new Lifter(window);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        lifter.acquire(drag);
        log.push('activate');
        return {
          start() {
            log.push('start');
          },
          settle() {
            log.push('settle');
          },
          end() {
            log.push('end');
          },
        };
      },
    }).use(lifter.cancelLanding);

    const { x, y } = await press('#r0');

    row('r0').remove();
    await commands.pointerMove(x, y + 40, 3);
    await release();
    expect(log).toEqual([]);
    expect(faults).toEqual([]);
  });
});

describe('drag:DRI-14 command activation', () => {
  it('should decline a command quietly when its item leaves during the lift', async () => {
    const list = makeList(3);
    const parking = document.createElement('div');

    document.body.append(parking);
    row('r1').tabIndex = 0;
    onFirstOpen(row('r1'), () => {
      parking.append(row('r1'));
    });
    basicSortable(list);
    row('r1').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(log).toEqual([]);
    expect(faults).toEqual([]);
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
  });

  it('should decline a command quietly when its move becomes impossible during the lift', async () => {
    const list = makeList(3);
    const parking = document.createElement('div');

    document.body.append(parking);
    row('r1').tabIndex = 0;
    // `r2` leaves, so `r1` is last and cannot move down.
    onFirstOpen(row('r1'), () => {
      parking.append(row('r2'));
    });
    basicSortable(list);
    row('r1').focus();
    await commands.keyPress('ArrowDown');
    await frames();
    expect(log).toEqual([]);
    expect(faults).toEqual([]);
    expect(order(list)).toBe('r0,r1');
  });

  it('should land a keyboard command from the old slot', async () => {
    const list = makeList(3);

    row('r0').tabIndex = 0;
    basicSortable(list, { landing: landing({ duration: 1000 }) });
    row('r0').focus();
    await commands.keyPress('ArrowDown');
    expect(order(list)).toBe('r1,r0,r2');

    const [flight] = row('r0')
      .getAnimations()
      .filter((animation) => {
        const [first] = (animation.effect as KeyframeEffect).getKeyframes();

        return first?.['translate'] !== undefined;
      });
    const [from] = (flight!.effect as KeyframeEffect).getKeyframes();

    expect(String(from!['translate'])).toBe('0px -40px');
  });
});

describe('drag:DRI-13 a grab during a landing', () => {
  it.each(['accepted', 'rejected'] as const)(
    'should keep the visual under the pointer during a %s landing',
    async (verdict) => {
      const list = makeList(4);

      basicSortable(list, {
        // Slow enough that the flight moves well under 1 px between the press and
        // the activation.
        landing: landing({ duration: 20_000, easing: 'linear' }),
        onReorder({ item, next }) {
          if (verdict === 'rejected') {
            return ReorderResolution.reject();
          }

          list.insertBefore(item, next);
          return ReorderResolution.accept();
        },
      });
      await grab('#r0', 0, 90);
      await release();
      await wait(300);

      const pressed = centerOf('#r0');

      await grab('#r0', 0, 40);

      const held = centerOf('#r0');

      expect(Math.abs(held.x - pressed.x)).toBeLessThan(1);
      expect(Math.abs(held.y - (pressed.y + 40))).toBeLessThan(1);
      await commands.keyPress('Escape');
      await commands.pointerUp();
    },
  );
});

describe('drag:DRI-15 placeholder faults', () => {
  it('should report sortable/anchor-outside-container when a gap neighbor leaves without invalidate', async () => {
    const list = makeList(5);
    const parking = document.createElement('div');

    document.body.append(parking);
    basicSortable(list);

    // Activated with no gap change, so the cache holds `r3` from here on.
    const start = await grab('#r0', 0, 10);

    parking.append(row('r3'));
    // Nearest `r2`: the gap between `r2` and `r3`, anchored on `r3`.
    await moveHeld(start.x, start.y + 70);
    await release();
    expect(faultMessages()).toEqual(['sortable/anchor-outside-container']);
    expect(log).toEqual(['start', 'end:canceled']);
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
  });

  it('should report sortable/insertion-placeholder-lost when the placeholder leaves at insertion', async () => {
    const list = makeList(3);

    basicSortable(list, {
      placeholder() {
        const placeholder = document.createElement('reaction-probe');

        ReactionProbe.react = () => {
          ReactionProbe.react = null;
          placeholder.remove();
        };
        return placeholder;
      },
    });
    onCleanup(() => {
      ReactionProbe.react = null;
    });
    await grab('#r0');
    await release();
    expect(faultMessages()).toEqual(['sortable/insertion-placeholder-lost']);
    expect(log).toEqual([]);
    expect(rowsOf(list)).toHaveLength(3);
  });
});

describe('drag:DRI-17 coalescing', () => {
  it('should schedule one frame for several samples in one task', async () => {
    const list = makeList(4);
    const { requestAnimationFrame: schedule } = window;
    let scheduled = 0;
    let pointerId = 0;

    onCleanup(() => {
      window.requestAnimationFrame = schedule;
    });
    list.addEventListener('pointerdown', (event) => {
      ({ pointerId } = event);
    });
    basicSortable(list);

    const { x, y } = await grab('#r0', 0, 20);

    window.requestAnimationFrame = (callback) => {
      scheduled += 1;
      return schedule.call(window, callback);
    };

    for (let i = 1; i <= 5; i += 1) {
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId,
          clientX: x,
          clientY: y + i * 9,
          buttons: 1,
          bubbles: true,
        }),
      );
    }

    window.requestAnimationFrame = schedule;
    expect(scheduled).toBe(1);
    await commands.keyPress('Escape');
    await commands.pointerUp();
  });
});
