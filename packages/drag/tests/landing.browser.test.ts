/** `drag:DRI-13`: landing and elevation. */
import { afterEach, describe, expect, it } from 'vitest';
import { freeDrag, FreeDragResolution } from '../src/free-drag.ts';
import { Lifter } from '../src/lift.ts';
import { landing } from '../src/sortable/landing.ts';
import { ReorderResolution } from '../src/sortable.ts';
import {
  basicSortable,
  centerOf,
  commands,
  dragAndDrop,
  faultMessages,
  faults,
  frames,
  grab,
  log,
  makeList,
  managed,
  onCleanup,
  release,
  rowsOf,
  targetOf,
} from './support/harness.ts';

const row = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`#${id}`)!;

const rejecting = {
  landing: landing({ duration: 1000, easing: 'linear' }),
  onReorder: () => ReorderResolution.reject('no'),
};

async function finished(element: HTMLElement): Promise<void> {
  await Promise.all(
    element.getAnimations().map((animation) => animation.finished),
  );
}

function topAtCenter(element: HTMLElement): Element | null {
  const { left, top, width, height } = element.getBoundingClientRect();

  return document.elementFromPoint(left + width / 2, top + height / 2);
}

describe('drag:DRI-13 landing', () => {
  afterEach(async () => {
    await commands.emulateReducedMotion(false);
  });

  it('should land additively from where it was dropped', async () => {
    const list = makeList(4);

    basicSortable(list, {
      ...rejecting,
      landing: landing({ duration: 200, easing: 'linear' }),
    });

    const home = centerOf('#r0');

    await grab('#r0', 0, 90);
    await commands.pointerUp();

    const composites = row('r0')
      .getAnimations()
      .map((animation) => (animation.effect as KeyframeEffect).composite);

    expect(composites).toContain('add');
    expect(row('r0').getBoundingClientRect().top).toBeGreaterThan(home.top + 5);
    await finished(row('r0'));
    expect(centerOf('#r0').y).toBeCloseTo(home.y, 0);
    expect(log).toEqual(['start', 'end:rejected']);
  });

  it('should start nothing when the visual is already where it lands', async () => {
    const list = makeList(3);

    const lifter = new Lifter(window);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);

        return {
          settle() {
            lift.land(lift.rect.x, lift.rect.y, landing());
          },
        };
      },
    }).use(lifter.cancelLanding);
    await grab('#r0', 0, 20);
    await commands.pointerUp();
    expect(row('r0').getAnimations()).toEqual([]);
  });

  it('should start nothing without a landing composed', async () => {
    const list = makeList(3);

    basicSortable(list, { onReorder: () => ReorderResolution.reject('no') });
    await grab('#r0', 0, 45);
    await commands.pointerUp();
    expect(row('r0').getAnimations()).toEqual([]);
  });

  it('should report a landing that cannot run, and let the outcome stand', async () => {
    const list = makeList(3);
    const outcomes: unknown[] = [];

    const lifter = new Lifter(window);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);

        return {
          move: () => {
            lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          settle() {
            lift.land(0, 0, landing({ duration: -5 }));
          },
          end(outcome) {
            outcomes.push(outcome);
          },
        };
      },
    }).use(lifter.cancelLanding);
    await dragAndDrop('#r1', 30);
    expect(outcomes).toEqual([{ type: 'skipped' }]);
    expect(faultMessages()).toHaveLength(1);
  });

  it('should keep the landing through a press that never activates, and cancel at the next activation', async () => {
    const list = makeList(4);

    basicSortable(list, {
      ...rejecting,
      landing: landing({ duration: 5000 }),
    });
    await dragAndDrop('#r0', 90);

    const running = (): number => row('r0').getAnimations().length;

    expect(running()).toBeGreaterThan(0);

    const { x, y } = centerOf('#r3');

    await commands.pointerMove(x, y);
    await commands.pointerDown();
    await commands.pointerUp();
    expect(running()).toBeGreaterThan(0);
    await grab('#r2');
    expect(running()).toBe(0);
    await commands.keyPress('Escape');
  });

  it.each([
    ['static siblings', ''],
    ['relative siblings', 'position:relative'],
    ['z-index siblings', 'position:relative;z-index:5'],
  ])('should stay above %s for the whole flight', async (_name, css) => {
    const list = makeList(4);

    for (const each of rowsOf(list)) {
      each.style.cssText += `;background:#ccd;${css}`;
    }

    basicSortable(list, rejecting);
    await grab('#r0', 0, 90);
    await commands.pointerUp();
    await frames(5);
    expect(row('r0').getAnimations().length).toBeGreaterThan(0);
    expect(topAtCenter(row('r0'))).toBe(row('r0'));
  });

  it('should keep an item with its own z-index on top, in every engine', async () => {
    const list = makeList(4);

    for (const each of rowsOf(list)) {
      each.style.cssText += ';background:#ccd;position:relative;z-index:5';
    }

    basicSortable(list, rejecting);
    await grab('#r0', 0, 90);
    await commands.pointerUp();
    await frames(5);
    expect(topAtCenter(row('r0'))).toBe(row('r0'));
  });

  it('should keep an absolutely positioned item on top', async () => {
    const list = makeList(4, document.body, 'position:relative;height:160px');

    rowsOf(list).forEach((each, index) => {
      each.style.cssText += `;background:#ccd;position:absolute;left:0;right:0;top:${index * 40}px;z-index:${index}`;
    });
    basicSortable(list, {
      ...rejecting,
      onReorder: () => ReorderResolution.reject('no'),
    });

    await grab('#r0', 0, 60);
    await commands.pointerUp();
    await frames(5);
    expect(topAtCenter(row('r0'))).toBe(row('r0'));
  });

  it('should leave no inline style from elevation', async () => {
    const list = makeList(3);

    basicSortable(list, {
      ...rejecting,
      landing: landing({ duration: 100 }),
    });

    const before = row('r0').getAttribute('style');

    await grab('#r0', 0, 45);
    await commands.pointerUp();
    expect(row('r0').getAttribute('style')).toBe(before);
    await finished(row('r0'));
    expect(row('r0').getAttribute('style')).toBe(before);
    expect(getComputedStyle(row('r0')).position).toBe('static');
    expect(getComputedStyle(row('r0')).zIndex).toBe('auto');
  });

  it('should start no animation when no landing is composed', async () => {
    const box = document.createElement('div');

    box.style.cssText =
      'position:absolute;left:20px;top:20px;width:40px;height:40px;background:#ccd;touch-action:none;user-select:none';
    document.body.append(box);

    const controller = freeDrag(box, {
      onDrop: () => FreeDragResolution.reject(),
    });

    onCleanup(() => controller.requestDestroy());
    await grab(box, 60, 40);
    await commands.pointerUp();
    expect(box.getAnimations()).toEqual([]);
    expect(centerOf(box).x).toBeCloseTo(40, 0);
  });

  it('should give a landing that `landing()` starts zero duration with reduced motion', async () => {
    await commands.emulateReducedMotion(true);

    const list = makeList(3);
    const durations: unknown[] = [];

    const lifter = new Lifter(window);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);

        return {
          move: () => {
            lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          settle() {
            lift.land(lift.rect.x, lift.rect.y, landing());
          },
        };
      },
    }).use(lifter.cancelLanding);

    const { animate } = Element.prototype;

    Element.prototype.animate = function capture(keyframes, options) {
      durations.push((options as KeyframeAnimationOptions).duration);
      return animate.call(this, keyframes, options);
    };

    try {
      await grab('#r0', 0, 45);
      await release();
    } finally {
      Element.prototype.animate = animate;
    }

    expect(durations).toEqual([0]);
  });

  it('should call a duration function with reduced motion, and still land at once', async () => {
    await commands.emulateReducedMotion(true);

    const list = makeList(3);
    let calls = 0;

    basicSortable(list, {
      landing: landing({
        duration() {
          calls += 1;
          return 400;
        },
      }),
      onReorder: () => ReorderResolution.reject('no'),
    });
    await grab('#r0', 0, 45);
    await release();
    expect(calls).toBe(1);
    expect(row('r0').getAnimations()).toEqual([]);
  });

  it('should land an accepted drop at its new slot', async () => {
    const list = makeList(4);
    const seen: number[] = [];

    basicSortable(list, {
      landing: landing({
        duration(context) {
          seen.push(context.toY);
          return 100;
        },
      }),
    });
    await grab('#r0', 20, 90);
    await commands.pointerUp();
    expect(seen).toEqual([80]);
    expect(row('r0').getAnimations().length).toBeGreaterThan(0);
    await finished(row('r0'));
    expect(row('r0').getBoundingClientRect().top).toBeCloseTo(80, 0);
  });

  it('should report and skip a landing when the consumer unmounted the item, and stay usable', async () => {
    const list = makeList(4);
    const outcomes: string[] = [];

    basicSortable(list, {
      landing: landing({ duration: 100 }),
      onReorder({ item }) {
        item.remove();
        return ReorderResolution.accept();
      },
      onEnd(result) {
        outcomes.push(result.type);
      },
    });
    await grab('#r0', 0, 60);
    await release();
    expect(outcomes).toEqual(['accepted']);
    expect(faultMessages()).toEqual(['sortable/landing-placeholder-lost']);
    expect(list.querySelector('[data-drag-placeholder]')).toBeNull();
    await grab('#r1', 0, 45);
    await release();
    expect(outcomes).toEqual(['accepted', 'accepted']);
  });

  it('should keep timing a custom landing named', async () => {
    const list = makeList(3);

    const lifter = new Lifter(window);

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);

        return {
          move: () => {
            lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          settle() {
            lift.land(
              lift.rect.x,
              lift.rect.y,
              landing({ duration: 321, easing: 'linear' }),
            );
          },
        };
      },
    }).use(lifter.cancelLanding);
    await grab('#r0', 0, 45);
    await commands.pointerUp();

    const [flight] = row('r0').getAnimations();
    const timing = flight!.effect!.getTiming();

    expect(timing.duration).toBe(321);
    expect(timing.easing).toBe('linear');
  });

  it('should keep the timing values returned at the land call when the timing reuses its object', async () => {
    const list = makeList(3);
    const lifter = new Lifter(window);
    const reused = { duration: 321, easing: 'linear' };
    const timing = (): typeof reused => reused;

    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);
        // Added after the lift's, so it runs before the lift's release.
        drag.use(() => {
          reused.duration = 4321;
          reused.easing = 'ease-in';
        });
        return {
          move: () => {
            lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          settle() {
            lift.land(lift.rect.x, lift.rect.y, { ...landing(), timing });
          },
        };
      },
    }).use(lifter.cancelLanding);
    await grab('#r0', 0, 45);
    await commands.pointerUp();

    const [flight] = row('r0').getAnimations();
    const flightTiming = flight!.effect!.getTiming();

    expect([flightTiming.duration, flightTiming.easing]).toEqual([
      321,
      'linear',
    ]);
  });

  it('should start a named landing when releasing the top layer throws, and let the outcome stand', async () => {
    const list = makeList(3);
    const hidden = new Error('hide');
    const ended: Array<{ outcome: unknown; animations: number }> = [];
    const lifter = new Lifter(window);

    row('r0').hidePopover = () => {
      throw hidden;
    };
    managed(list, {
      admit: (event) => ({ item: targetOf(event) }),
      activate(drag) {
        const lift = lifter.acquire(drag);

        return {
          move: () => {
            lift.translate(drag.x - drag.originX, drag.y - drag.originY);
          },
          settle() {
            lift.land(lift.rect.x, lift.rect.y, landing({ duration: 5000 }));
          },
          end(outcome) {
            ended.push({
              outcome,
              animations: row('r0').getAnimations().length,
            });
          },
        };
      },
    }).use(lifter.cancelLanding);
    await grab('#r0', 0, 45);
    await release();
    expect(faults.map((fault) => fault.cause)).toEqual([hidden]);
    expect(ended).toEqual([{ outcome: { type: 'skipped' }, animations: 2 }]);
  });
});
