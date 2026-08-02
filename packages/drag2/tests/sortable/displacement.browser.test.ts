/**
 * `vertical()` and `layoutAnimation()` **together**, through the public
 * composition.
 *
 * Every other suite drives these two alone, and alone they were both correct.
 * The bug they had was in the composition: `vertical()` measures with
 * `getBoundingClientRect()`, which includes a running FLIP offset, so it read
 * items where they no longer were while reading the placeholder where it now
 * is — a mixed field that proposes moving back and oscillates for the length of
 * an animation. The rule these tests pin is contract 03's **settled
 * presentation geometry**: the insertion rule sees authored element and
 * ancestor transforms, and never a displacement offset the library applied.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { vertical } from '../../src/sortable/vertical.ts';
import {
  ReorderResolution,
  type ReorderRequest,
  type SortableController,
  type SortableFeature,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 17;
const ITEM_HEIGHT = 40;
const DURATION = 500;

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  requests: ReorderRequest[];
  errors: unknown[];
  /** The flow order, placeholder written as `_`; non-item children are skipped. */
  order(): string;
  dispose(): void;
}>;

const cleanup: Array<() => void> = [];

type Reporting = { reportError?(error: unknown): void };

let reported: unknown[] = [];

beforeEach(() => {
  reported = [];
  (globalThis as Reporting).reportError = (error): void => {
    reported.push(error);
  };
});

afterEach(() => {
  delete (globalThis as Reporting).reportError;

  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

type Options = Readonly<{
  itemCount?: number;
  features?: readonly SortableFeature[];
  /** Runs on each row before the controller is armed. */
  decorate?(item: HTMLElement, index: number): void;
  /** Extra non-item children appended to the root. */
  extras?(root: HTMLElement): void;
}>;

function build(options: Options = {}): Composed {
  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '200px',
    position: 'absolute',
    top: '0px',
    left: '0px',
  });
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.itemCount ?? 3); i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    item.dataset['row'] = String(i);
    options.decorate?.(item, i);
    root.append(item);
    items.push(item);
  }

  options.extras?.(root);

  const requests: ReorderRequest[] = [];
  const errors: unknown[] = [];

  const controller = draggable(
    root,
    sortable(
      items,
      vertical(),
      callbacks({
        onReorder(request) {
          requests.push(request);
          return ReorderResolution.accept();
        },
        onError: (error): void => {
          errors.push(error);
        },
      }),
      ...(options.features ?? []),
    ),
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  const composed: Composed = {
    root,
    items,
    controller,
    requests,
    errors,
    order: () =>
      [...root.children]
        .map((child) => {
          if (child.hasAttribute('data-drag-placeholder')) {
            return '_';
          }

          const index = items.indexOf(child as HTMLElement);

          return index === -1 ? '' : String(index);
        })
        .join(''),
    dispose(): void {
      controller.destroy();
      root.remove();
    },
  };

  // Torn down one at a time: two live controllers both see the document-level
  // pointer stream, and the second root would sit out of reach of the
  // coordinates these tests use.
  cleanup.push(composed.dispose);
  return composed;
}

const press = (target: HTMLElement, y = 10): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: y,
    }),
  );
};

const pointerEvent = (type: string, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: 10,
      clientY: y,
    }),
  );
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** One pointer sample plus the coalesced spatial frame it schedules. */
const drag = async (y: number): Promise<void> => {
  pointerEvent('pointermove', y);
  await nextFrame();
};

const activate = (composed: Composed): void => {
  press(composed.items[0]!);
  pointerEvent('pointermove', 30);
};

/**
 * Activate on a row that is **not** the first.
 *
 * The dragged row keeps its DOM position for the whole drag, so a backward span
 * reaches it only when the destination gap is above it — which cannot happen
 * when row 0 is the one being dragged. Every test about excluding the dragged
 * item therefore has to grab a middle row.
 */
const activateRow = (composed: Composed, index: number): void => {
  const top = index * ITEM_HEIGHT;

  press(composed.items[index]!, top + 10);
  pointerEvent('pointermove', top + 30);
};

const release = (y: number): void => {
  pointerEvent('pointerup', y);
};

/** The animations this library owns: the ones driving `translate`. */
const displacements = (element: HTMLElement): Animation[] =>
  element.getAnimations().filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;

    // Additive **and** on `translate`. The property alone is not enough to tell
    // ours apart: a consumer animating `translate` is exactly the case these
    // tests exist to prove we compose with rather than replace.
    return (
      effect?.composite === 'add' &&
      effect.getKeyframes().some((frame) => 'translate' in frame)
    );
  });

const running = (element: HTMLElement): Animation[] =>
  displacements(element).filter(
    (animation) => animation.playState === 'running',
  );

/** Rows currently carrying a displacement, by index. */
const displaced = (composed: Composed): number[] =>
  composed.items
    .map((item, index) => (displacements(item).length > 0 ? index : -1))
    .filter((index) => index !== -1);

const withLayout = (): readonly SortableFeature[] => [
  layoutAnimation({ duration: DURATION }),
];

describe('the engine under test', () => {
  it('should compose an additive translate animation with the authored value', async () => {
    // The whole displacement design rests on this being true in **this**
    // engine, so it is asserted rather than assumed. If a second browser is
    // ever added to the browser project's `instances`, this fails there first
    // and names the reason, instead of the failure surfacing as a mysterious
    // sortable regression.
    const element = document.createElement('div');

    element.style.height = '10px';
    element.style.translate = '0 10px';
    document.body.append(element);
    cleanup.push(() => {
      element.remove();
    });

    const animation = element.animate(
      [{ translate: '0 30px' }, { translate: '0 0' }],
      { duration: 1000, composite: 'add' },
    );

    animation.pause();
    animation.currentTime = 0;
    await animation.ready;

    // 10px authored + 30px added, not 30px replacing 10px.
    expect(getComputedStyle(element).translate).toBe('0px 40px');

    animation.currentTime = 1000;
    expect(getComputedStyle(element).translate).toBe('0px 10px');
    animation.cancel();
  });
});

describe('settled presentation geometry', () => {
  it('should not propose a reversal while a displacement is running', async () => {
    // The regression. After the gap moves below row 1, the pointer sits where
    // the *settled* field keeps the placeholder as the nearest candidate — but
    // where row 1's animating position is closer. Reading mid-flight proposes
    // moving straight back, which re-animates, which proposes again.
    const composed = build({ features: withLayout() });

    activate(composed);
    await drag(55);

    // The dragged row is lifted out of flow but still in the tree, so it stays
    // at index 0 of the DOM order throughout.
    expect(composed.order()).toBe('01_2');
    expect(running(composed.items[1]!)).toHaveLength(1);

    await drag(45);

    // Reading mid-flight would answer `0_12` here — the gap back above row 1.
    expect(composed.order()).toBe('01_2');
  });

  it('should choose the same gap as it would with every displacement cancelled', async () => {
    // The definition, stated directly: what the axis resolves must not depend
    // on whether an offset happens to be applied at that instant.
    const script = async (cancelBefore: boolean): Promise<string> => {
      const composed = build({ features: withLayout() });

      activate(composed);
      await drag(55);

      if (cancelBefore) {
        for (const item of composed.items) {
          for (const animation of displacements(item)) {
            animation.cancel();
          }
        }
      }

      await drag(45);

      const order = composed.order();

      composed.dispose();
      return order;
    };

    expect(await script(false)).toBe(await script(true));
  });

  it('should reach the same outcome with and without layoutAnimation', async () => {
    // The strongest joint invariant available: a feature that only animates
    // must not change what the drag *decides*. Same pointer script, both
    // compositions, every intermediate order compared — not just the result.
    const script = async (
      features: readonly SortableFeature[],
    ): Promise<readonly [string[], ReorderRequest | undefined]> => {
      const composed = build({ features });
      const orders: string[] = [];

      activate(composed);

      // Written out rather than looped: the samples are a script, and each one
      // is answered by the frame it schedules before the next is dispatched.
      const step = async (y: number): Promise<void> => {
        await drag(y);
        orders.push(composed.order());
      };

      await step(55);
      await step(45);
      await step(95);
      await step(110);

      release(110);

      const [request] = composed.requests;

      composed.dispose();
      return [orders, request];
    };

    const [plainOrders, plainRequest] = await script([]);
    const [animatedOrders, animatedRequest] = await script(withLayout());

    expect(animatedOrders).toEqual(plainOrders);
    expect(animatedRequest?.from).toBe(plainRequest?.from);
    expect(animatedRequest?.to).toBe(plainRequest?.to);
  });
});

describe('displacement ownership', () => {
  it('should never displace the dragged item', async () => {
    // Not hypothetical: the placeholder is inserted immediately after the item,
    // so the dragged row is the first sibling of every backward span. The
    // kernel's lift owns that element's presentation.
    const composed = build({ features: withLayout(), itemCount: 4 });

    activateRow(composed, 2);
    await drag(10);

    expect(displaced(composed)).not.toEqual([]);
    expect(displacements(composed.items[2]!)).toEqual([]);
    expect(composed.items[2]!.style.translate).toBe('');
  });

  it('should not even measure the dragged item', async () => {
    // Exclusion has to be pinned by a read count, because the lift makes the
    // dragged row `position: fixed` — its rect is identical before and after
    // the write, so a bracket that *did* collect it produces a zero delta and
    // animates nothing. The ownership violation is invisible in the output and
    // visible only in the reads. The axis excludes it too, so the correct
    // count across a committed move is zero.
    const composed = build({ features: withLayout(), itemCount: 4 });
    const dragged = composed.items[2]!;
    const native = Element.prototype.getBoundingClientRect;
    let reads = 0;

    // Grabbed from the middle, and the counted move is the **first** one and
    // goes up. The placeholder starts immediately after the dragged row, so
    // that is the only arrangement in which a backward walk reaches it: after
    // any move the placeholder no longer sits below it.
    activateRow(composed, 2);

    Element.prototype.getBoundingClientRect = function counted(
      this: Element,
    ): DOMRect {
      if (this === dragged) {
        reads += 1;
      }

      return native.call(this);
    };

    try {
      await drag(10);
    } finally {
      Element.prototype.getBoundingClientRect = native;
    }

    expect(reads).toBe(0);
  });

  it('should never displace a non-item sibling', async () => {
    const decoration = document.createElement('div');
    const composed = build({
      features: withLayout(),
      extras(root): void {
        decoration.style.height = `${ITEM_HEIGHT}px`;
        // Between the rows, so any sibling walk passes straight through it.
        root.children[1]!.after(decoration);
      },
    });

    activate(composed);
    await drag(95);

    expect(displaced(composed)).not.toEqual([]);
    expect(displacements(decoration)).toEqual([]);
  });

  it('should never displace the placeholder itself', async () => {
    const composed = build({ features: withLayout() });

    activate(composed);
    await drag(55);

    const placeholder = composed.root.querySelector<HTMLElement>(
      '[data-drag-placeholder]',
    )!;

    expect(displacements(placeholder)).toEqual([]);
  });

  it('should stop displacing a row that left the collection', async () => {
    // The row is dropped from the collection while its displacement is still
    // in flight, and the *next* move crosses back over it — so its layout
    // really does change and a bracket that still owned it would animate it.
    // It stays in the DOM, so only membership can exclude it.
    const composed = build({ features: withLayout(), itemCount: 4 });

    activate(composed);
    await drag(130);

    expect(displaced(composed)).toEqual([1, 2, 3]);

    composed.controller.updateItems([
      composed.items[0]!,
      composed.items[2]!,
      composed.items[3]!,
    ]);
    await drag(20);

    // Released with everything else, and never given a new one.
    expect(displacements(composed.items[1]!)).toEqual([]);
    expect(displaced(composed)).not.toEqual([]);
  });

  it('should cancel a displacement it could not track', async () => {
    // Acquisition is all-or-nothing, exactly as in `landing()`: `finished` is
    // an accessor and `then` is a call. An animation started but never entered
    // into the map would survive `retire()` and keep offsetting a row nothing
    // owns.
    const composed = build({ features: withLayout() });
    const native = Element.prototype.animate;
    let created: Animation | null = null;

    activate(composed);

    Element.prototype.animate = function patched(
      this: Element,
      ...args: Parameters<Element['animate']>
    ): Animation {
      const animation = native.apply(this, args);

      created = animation;
      Object.defineProperty(animation, 'finished', {
        configurable: true,
        get(): never {
          throw new Error('no finished for you');
        },
      });

      return animation;
    };

    try {
      await drag(55);
    } finally {
      Element.prototype.animate = native;
    }

    expect((created as Animation | null)?.playState).toBe('idle');
    expect(composed.errors).toHaveLength(1);
    expect(displaced(composed)).toEqual([]);
  });
});

describe('authored presentation survives displacement', () => {
  it('should leave an authored transform untouched', async () => {
    const composed = build({
      features: withLayout(),
      decorate(item, index): void {
        if (index === 1) {
          item.style.transform = 'rotate(4deg)';
        }
      },
    });

    activate(composed);
    await drag(55);

    const row = composed.items[1]!;

    // Still rotated *while* displaced: the offset is on `translate`, which is a
    // different property and applies outside `transform` in the used-value
    // chain — so it is also not scaled or rotated by it.
    expect(running(row)).toHaveLength(1);
    expect(getComputedStyle(row).transform).not.toBe('none');
    expect(row.style.transform).toBe('rotate(4deg)');
  });

  it('should compose with an authored translate value', async () => {
    const composed = build({
      features: withLayout(),
      decorate(item, index): void {
        if (index === 1) {
          item.style.translate = '0 7px';
        }
      },
    });

    activate(composed);
    await drag(55);

    const row = composed.items[1]!;
    const [animation] = running(row);

    animation!.pause();
    animation!.currentTime = 0;

    // 7px authored + the 40px inversion, added rather than replacing.
    expect(getComputedStyle(row).translate).toBe('0px 47px');

    animation!.currentTime = DURATION;
    expect(getComputedStyle(row).translate).toBe('0px 7px');
    // And the authored declaration is never rewritten.
    expect(row.style.translate).toBe('0px 7px');
  });

  it('should leave a concurrent consumer animation on transform running', async () => {
    const composed = build({ features: withLayout() });
    const row = composed.items[1]!;
    const consumer = row.animate(
      [{ transform: 'translateX(0px)' }, { transform: 'translateX(50px)' }],
      { duration: 10_000 },
    );

    activate(composed);
    await drag(55);

    expect(consumer.playState).toBe('running');
    expect(running(row)).toHaveLength(1);
    // Both effects coexist: the library never writes the property the consumer
    // is animating.
    expect(row.getAnimations()).toHaveLength(2);

    consumer.cancel();
  });

  it('should compose with a concurrent consumer animation on translate', async () => {
    const composed = build({ features: withLayout() });
    const row = composed.items[1]!;
    // Held on X. A consumer offset on **Y** is not ours, so by the definition
    // of settled presentation geometry the axis legitimately sees it — a row
    // the consumer has visually pushed 100px down really is 100px further from
    // the pointer, and no move would be committed at all.
    const consumer = row.animate(
      [{ translate: '10px 0px' }, { translate: '10px 0px' }],
      { duration: 10_000 },
    );

    activate(composed);
    await drag(55);

    const [displacement] = running(row);

    expect(consumer.playState).toBe('running');
    consumer.pause();
    displacement!.pause();
    displacement!.currentTime = 0;

    // The same property, from two owners, and neither is lost: the consumer's
    // 10px is the underlying value the library's inversion is added to.
    expect(getComputedStyle(row).translate).toBe('10px 40px');

    displacement!.currentTime = DURATION;
    expect(getComputedStyle(row).translate).toBe('10px');

    consumer.cancel();
  });
});

describe('retargeting a running displacement', () => {
  it('should hold at most one displacement per row', async () => {
    const composed = build({ features: withLayout(), itemCount: 5 });

    activate(composed);

    const step = async (y: number): Promise<void> => {
      await drag(y);

      for (const item of composed.items) {
        expect(displacements(item).length).toBeLessThan(2);
      }
    };

    // Out and back across four rows, so later moves keep retargeting rows that
    // are still in flight from earlier ones.
    await step(55);
    await step(95);
    await step(135);
    await step(175);
    await step(95);
    await step(55);
  });

  it('should replay a still-running row from where it visually is', async () => {
    // Continuity: the second move measures the row where the first animation
    // has it *now*, so the replacement starts from the interrupted position
    // rather than from a fresh full delta.
    const composed = build({ features: withLayout(), itemCount: 5 });

    activate(composed);
    await drag(55);

    const row = composed.items[1]!;
    const first = displacements(row)[0]!;

    // Left paused, so the position measured here is exactly the position the
    // next bracket will capture as its "First".
    first.pause();
    first.currentTime = DURATION / 2;
    await first.ready;

    const midpoint = row.getBoundingClientRect().top;

    await drag(95);

    const second = running(row)[0]!;

    expect(second).not.toBe(first);
    second.pause();
    second.currentTime = 0;

    // Back where it visually was, not snapped to a full inversion.
    expect(row.getBoundingClientRect().top).toBeCloseTo(midpoint, 0);
  });

  it('should release a row still running from an earlier move', async () => {
    // The set a bracket owns is the span **∪** whatever is still in flight: an
    // element left carrying an offset is exactly what corrupts the axis read
    // the bracket exists to protect.
    const composed = build({ features: withLayout(), itemCount: 5 });

    activate(composed);
    await drag(55);

    const stale = running(composed.items[1]!)[0]!;

    await drag(95);

    // The first animation is gone — cancelled and replaced, never left lying.
    expect(stale.playState).toBe('idle');
    expect(running(composed.items[1]!)).toHaveLength(1);
  });
});

describe('the composed bracket cost', () => {
  it('should read only the span, the in-flight set, and the axis pass', async () => {
    // M-4's answer for the *composition*, and the reason it needs a count: the
    // affected set is invisible in the animations, because a row with a zero
    // delta is skipped whether or not it was measured.
    const rows = 12;
    const native = Element.prototype.getBoundingClientRect;

    const measure = async (
      features: readonly SortableFeature[],
    ): Promise<number> => {
      const composed = build({ itemCount: rows, features });
      let reads = 0;

      activate(composed);
      await drag(55);

      Element.prototype.getBoundingClientRect = function counted(
        this: Element,
      ): DOMRect {
        if (composed.items.includes(this as HTMLElement)) {
          reads += 1;
        }

        return native.call(this);
      };

      try {
        await drag(95);
      } finally {
        Element.prototype.getBoundingClientRect = native;
      }

      composed.dispose();
      return reads;
    };

    const baseline = await measure([]);
    const bracketed = await measure(withLayout());

    // Both runs pay the axis rebuild. The difference is the bracket: the row
    // this move crosses, the anchor it stops at, and the row still in flight
    // from the previous move — measured before and after. A destination-view
    // bracket would add 2 × 12 instead.
    expect(baseline).toBeGreaterThan(0);
    expect(bracketed - baseline).toBeGreaterThan(0);
    expect(bracketed - baseline).toBeLessThan(rows);
  });
});

describe('teardown', () => {
  it('should leave no displacement and no authored value behind', async () => {
    const composed = build({
      features: withLayout(),
      itemCount: 5,
      decorate(item, index): void {
        if (index === 1) {
          item.style.translate = '0 7px';
        }
      },
    });

    activate(composed);
    await drag(135);
    composed.controller.cancel('reason');

    expect(displaced(composed)).toEqual([]);
    expect(composed.items[1]!.style.translate).toBe('0px 7px');
    expect(composed.items[2]!.style.translate).toBe('');
    expect(reported).toEqual([]);
    expect(composed.errors).toEqual([]);
  });
});
