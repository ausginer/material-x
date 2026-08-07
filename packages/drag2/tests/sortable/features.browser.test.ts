/**
 * The optional features, through the public composition.
 *
 * Each one is a slot the behavior reaches only when something filled it, so the
 * question every test here asks is the same: does installing it change exactly
 * the one thing it claims, and does the behavior still do everything it did
 * without it? The minimal composition already proved the second half in
 * `composition.browser.test.ts`; these add the first.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import { handle, visual } from '../../src/sortable/handle.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { placeholder } from '../../src/sortable/placeholder.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableController,
  type SortableFeature,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 14;
const ITEM_HEIGHT = 40;

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  finishes: unknown[];
  cancels: unknown[];
  errors: unknown[];
  placeholder(): HTMLElement | null;
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

type ComposeOptions = Readonly<{
  itemCount?: number;
  onReorder?: Parameters<typeof callbacks>[0]['onReorder'];
  features?: readonly SortableFeature[];
}>;

/** 40px items, plus whichever optional features the test installs. */
function composeWith(options: ComposeOptions = {}): Composed {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.itemCount ?? 3); i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const finishes: unknown[] = [];
  const cancels: unknown[] = [];
  const errors: unknown[] = [];

  const controller = draggable(
    root,
    sortable(
      items,
      y(),
      callbacks({
        onReorder: options.onReorder ?? (() => ReorderResolution.accept()),
        onFinish: (result): void => {
          finishes.push(result);
        },
        onCancel: (result): void => {
          cancels.push(result);
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

  cleanup.push(() => {
    controller.destroy();
    root.remove();
  });

  return {
    root,
    items,
    controller,
    finishes,
    cancels,
    errors,
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
  };
}

const compose = (...features: readonly SortableFeature[]): Composed =>
  composeWith({ features });

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

const move = (y: number): void => {
  pointerEvent('pointermove', y);
};

const release = (y: number): void => {
  pointerEvent('pointerup', y);
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const activate = (composed: Composed): void => {
  press(composed.items[0]!);
  move(30);
};

const drag = async (y: number): Promise<void> => {
  move(y);
  await nextFrame();
};

describe('placeholder', () => {
  it('should add the configured classes to the default element', () => {
    const composed = compose(placeholder({ className: 'ghost dim' }));

    activate(composed);

    expect([...composed.placeholder()!.classList]).toEqual(['ghost', 'dim']);
  });

  it('should use the element the factory returned', () => {
    const composed = compose(
      placeholder({ create: () => document.createElement('section') }),
    );

    activate(composed);

    expect(composed.placeholder()!.localName).toBe('section');
  });

  it('should keep the classes the factory already set', () => {
    // Customisation, not replacement: `classList.add`, never an assignment.
    const composed = compose(
      placeholder({
        className: 'ghost',
        create: () => {
          const element = document.createElement('div');

          element.className = 'authored';
          return element;
        },
      }),
    );

    activate(composed);

    expect([...composed.placeholder()!.classList]).toEqual([
      'authored',
      'ghost',
    ]);
  });

  it('should still apply the default mechanics to a custom element', () => {
    // The mechanics are not configurable away, and they belong to the behavior
    // rather than to this feature — so they have to survive a factory.
    const composed = compose(
      placeholder({ create: () => document.createElement('section') }),
    );

    activate(composed);

    const element = composed.placeholder()!;

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.getBoundingClientRect().height).toBe(ITEM_HEIGHT);
  });

  it('should refuse a factory result that is already connected', () => {
    // Refused inside `activation.prepare`, before anything is inserted: the
    // behavior *adopts* the result, so teardown would remove a node the page
    // owns.
    const composed = compose(placeholder({ create: () => composed.items[2]! }));

    activate(composed);

    expect(composed.errors).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[2]!.isConnected).toBe(true);
  });

  it('should classify a factory that throws and leave nothing acquired', () => {
    // The matrix's resource-cleanup row. A throwing factory is the earliest
    // point at which the operation already owns something — the lift was
    // acquired in `activation.prepare` before the placeholder existed — so the
    // question is whether a discarded prepare releases it.
    const failure = new Error('no placeholder for you');
    const composed = compose(
      placeholder({
        create: (): HTMLElement => {
          throw failure;
        },
      }),
    );

    activate(composed);

    expect(composed.errors).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
    expect(composed.items[0]!.style.transform).toBe('');
  });

  it('should stay usable after a factory throw', () => {
    let failing = true;
    const composed = compose(
      placeholder({
        create: (): HTMLElement => {
          if (failing) {
            throw new Error('once');
          }

          return document.createElement('div');
        },
      }),
    );

    activate(composed);
    failing = false;
    activate(composed);

    expect(composed.placeholder()).not.toBeNull();
  });
});

describe('handle', () => {
  it('should admit a press inside the resolved handle', () => {
    const grip = document.createElement('span');
    const composed = compose(handle(() => grip));

    composed.items[0]!.append(grip);
    press(grip);
    move(30);

    expect(composed.placeholder()).not.toBeNull();
  });

  it('should refuse a press outside the resolved handle', () => {
    const grip = document.createElement('span');
    const composed = compose(handle(() => grip));

    composed.items[0]!.append(grip);
    activate(composed);

    expect(composed.placeholder()).toBeNull();
  });

  it('should refuse every press when the resolver returns null', () => {
    const composed = compose(handle(() => null));

    activate(composed);

    expect(composed.placeholder()).toBeNull();
  });

  it('should not change which item is dragged', async () => {
    // Admission narrows; identity does not move. The request still names the
    // item the collection knows.
    const grip = document.createElement('span');
    const requests: Array<Readonly<{ item: HTMLElement }>> = [];
    const root = document.createElement('div');

    document.body.append(root);

    const items: HTMLElement[] = [];

    for (let i = 0; i < 3; i += 1) {
      const item = document.createElement('div');

      Object.assign(item.style, {
        display: 'block',
        width: '100px',
        height: `${ITEM_HEIGHT}px`,
      });
      root.append(item);
      items.push(item);
    }

    items[0]!.append(grip);

    const controller = draggable(
      root,
      sortable(
        items,
        y(),
        handle(() => grip),
        callbacks({
          onReorder: (request) => {
            requests.push(request);
            return ReorderResolution.accept();
          },
        }),
      ),
    );

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push(() => {
      controller.destroy();
      root.remove();
    });

    press(grip);
    move(30);
    await drag(55);
    release(55);

    expect(requests[0]!.item).toBe(items[0]);
  });
});

describe('visual', () => {
  it('should lift the resolved element instead of the item', () => {
    const inner = document.createElement('div');
    const composed = compose(visual(() => inner));

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);

    // The lift promotes what it is given: the inner element goes fixed, the
    // item does not.
    expect(inner.style.position).toBe('fixed');
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should size the placeholder from the resolved visual', () => {
    // The placeholder is the *footprint*, and the footprint of a drag is
    // whatever was lifted out of the flow.
    const inner = document.createElement('div');
    const composed = compose(visual(() => inner));

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);

    expect(composed.placeholder()!.getBoundingClientRect().height).toBe(20);
  });

  it('should restore the resolved visual at teardown', () => {
    const inner = document.createElement('div');
    const composed = compose(visual(() => inner));

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);
    composed.controller.cancel('reason');

    expect(inner.style.position).toBe('');
    expect(inner.style.transform).toBe('');
  });
});

describe('landing', () => {
  it('should hold settlement open until the animation finishes', async () => {
    const composed = compose(landing({ duration: 50 }));

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    // The gate is held: presentation is still owned, so the placeholder is
    // still standing in for the item.
    expect(composed.finishes).toEqual([]);
    expect(composed.placeholder()).not.toBeNull();
  });

  it('should finalize once the animation completes', async () => {
    const composed = compose(landing({ duration: 1 }));

    activate(composed);
    await drag(55);
    release(55);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
  });

  it('should hold the gate even with a zero duration', async () => {
    // `duration: 0` is immediate but still goes through the runner — the same
    // code path, so there is one lifecycle rather than two.
    const composed = compose(landing({ duration: 0 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.items[0]!.getAnimations()).toHaveLength(1);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });

  it('should relinquish the transform so the kernel pin wins', async () => {
    const composed = compose(landing({ duration: 1 }));

    activate(composed);
    await drag(55);
    release(55);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    // Destroyed before the pin, so nothing of the animation survives the join.
    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.items[0]!.style.transform).toBe('');
  });

  it('should let a custom runner replace the default entirely', async () => {
    let complete: (() => void) | null = null;
    const composed = compose(
      landing({
        run: (_context, done) => {
          complete = done;
          return { destroy: (): void => {} };
        },
      }),
    );

    activate(composed);
    await drag(55);
    release(55);

    // No Web Animation at all: the replacement is total, not a wrapper.
    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.finishes).toEqual([]);

    complete!();
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });

  it('should classify a runner that fails as a landing failure', async () => {
    const composed = compose(
      landing({
        run: (_context, _done, fail) => {
          fail(new Error('spring exploded'));
          return { destroy: (): void => {} };
        },
      }),
    );

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toHaveLength(1);
  });

  it('should cancel the animation when subscribing to it throws', async () => {
    // `animate()` succeeding is not the same as acquiring a runner: `finished`
    // is an accessor and `then` is a call, and either can throw. An animation
    // left playing at that point keeps writing the transform with nothing able
    // to stop it, because the handle being built never reaches the kernel.
    const composed = compose(landing({ duration: 400 }));
    const native = Element.prototype.animate;
    let created: Animation | null = null;

    Element.prototype.animate = function animate(
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
      activate(composed);
      await drag(55);
      release(55);
    } finally {
      Element.prototype.animate = native;
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toHaveLength(1);
    expect((created as Animation | null)?.playState).toBe('idle');
    expect(composed.items[0]!.getAnimations()).toEqual([]);
  });

  it('should collapse the duration under a reduced-motion preference', async () => {
    // Collapsed, not skipped: the gate is still held and still released through
    // the runner, so there is one lifecycle whatever the preference is.
    const composed = compose(landing({ duration: 400 }));
    const native = window.matchMedia;

    window.matchMedia = (query: string): MediaQueryList => {
      const stub: Partial<MediaQueryList> = {
        matches: query.includes('reduce'),
        media: query,
      };

      // Only `matches` is read, and only through `realm.window`.
      return stub as MediaQueryList;
    };

    try {
      activate(composed);
      await drag(55);
      release(55);
    } finally {
      window.matchMedia = native;
    }

    const [animation] = composed.items[0]!.getAnimations();

    expect(animation!.effect!.getComputedTiming().duration).toBe(0);
  });

  it('should not report a retargeted animation as a failure', async () => {
    // A late acknowledgement makes the kernel retarget the runner, and a
    // retarget cancels — which WAAPI surfaces as a rejected `finished`. Without
    // a generation guard that would be reported as a landing failure for an
    // operation that is landing perfectly well.
    let pending!: ReorderRequest;
    const composed = composeWith({
      onReorder: (request) => {
        pending = request;
        return ReorderResolution.accept({ presentation: true });
      },
      features: [landing({ duration: 400 })],
    });

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();

    composed.controller.ready(pending);
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
  });

  it('should read a duration thunk at settle time, once per landing', async () => {
    // 13b B-2, the ergonomics half of Phase 15. The shipped package read
    // `landingTiming()` after the settlement step that decides where the visual
    // is going; a thunk restores that timing without giving up anything the
    // default runner provides — the reduced-motion collapse, the retarget
    // replay and the generation guard all still apply.
    const reads: string[] = [];
    const composed = composeWith({
      features: [
        landing({
          duration: () => {
            reads.push('read');
            return 40;
          },
        }),
      ],
    });

    // Nothing is read until a drop actually settles.
    expect(reads).toEqual([]);

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();

    expect(reads).toEqual(['read']);
  });

  it('should not report a cancelled animation as a failure', async () => {
    // `retarget` and teardown both cancel, and WAAPI rejects `finished` on a
    // cancel — which would otherwise surface as a landing failure for an
    // operation that is landing perfectly well.
    const composed = compose(landing({ duration: 500 }));

    activate(composed);
    await drag(55);
    release(55);
    composed.controller.destroy();
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
    expect(reported).toEqual([]);
  });
});

describe('layoutAnimation', () => {
  /** The rows currently carrying a displacement animation. */
  const displaced = (composed: Composed): number[] =>
    composed.items
      .map((item, index) => (item.getAnimations().length > 0 ? index : -1))
      .filter((index) => index !== -1);

  it('should animate only the rows the move crossed', async () => {
    // M-4's answer, made observable: the span between the two gaps, not the
    // destination view. Row 2 never moves, so it is never animated.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(55);

    expect(displaced(composed)).toEqual([1]);
  });

  it('should animate every row a multi-slot move crossed', async () => {
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);

    expect(displaced(composed)).toEqual([1, 2]);
  });

  it('should animate nothing for a move that did not happen', async () => {
    // The bracket is skipped entirely when the placeholder is already in place,
    // so an inert frame costs no measurement at all.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(35);

    expect(displaced(composed)).toEqual([]);
  });

  it('should invert the displacement it measured', async () => {
    // FLIP: the row starts visually where it was and ends where it now is.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(55);

    const [animation] = composed.items[1]!.getAnimations();
    const frames = (
      animation as Animation & {
        effect: KeyframeEffect;
      }
    ).effect.getKeyframes();

    // On `translate`, never `transform`, and additively — so an authored
    // transform on the row survives the displacement untouched.
    expect(frames[0]!['translate']).toBe(`0px ${ITEM_HEIGHT}px`);
    expect(frames.at(-1)!['translate']).toBe('0px');
    // The composite lives on the effect; per-keyframe it reads back as `auto`,
    // meaning "inherit from the effect".
    expect(
      (animation as Animation & { effect: KeyframeEffect }).effect.composite,
    ).toBe('add');
    expect(frames[0]!['transform']).toBeUndefined();
  });

  it('should replace a running displacement rather than stack one', async () => {
    // Out to the end and back, so both moves cross row 1 and the second one
    // retargets a displacement that is still running. Crossing a different row
    // each time would prove nothing.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);
    await drag(15);

    // "Never stacks" is the property, and it is an **upper** bound: a round
    // trip completed before the first displacement has visibly progressed
    // correctly produces no second animation at all, because the row is already
    // where it belongs. Filtered by play state, because a finished animation
    // lingers in `getAnimations()` until the engine removes it.
    const running = composed.items[1]!.getAnimations().filter(
      (animation) => animation.playState === 'running',
    );

    expect(running.length).toBeLessThan(2);
  });

  it('should measure only the span, not the destination view', async () => {
    // M-4's answer is a *cost* property, not a visible one: a whole-list
    // bracket produces the same animations, because every row outside the span
    // has a zero delta and is skipped. So the only honest way to pin it is to
    // count the layout reads the bracket actually performs.
    const rows = 12;
    const native = Element.prototype.getBoundingClientRect;

    // One list at a time, each torn down before the next is built: two live
    // controllers would both see the document-level pointer stream, and the
    // second list would sit below the first, out of reach of the coordinates.
    const measure = async (
      features: readonly SortableFeature[],
    ): Promise<number> => {
      const composed = composeWith({ itemCount: rows, features });
      let reads = 0;

      activate(composed);

      Element.prototype.getBoundingClientRect = function counted(
        this: Element,
      ): DOMRect {
        if (composed.items.includes(this as HTMLElement)) {
          reads += 1;
        }

        return native.call(this);
      };

      try {
        await drag(55);
      } finally {
        Element.prototype.getBoundingClientRect = native;
      }

      composed.controller.destroy();
      composed.root.remove();
      return reads;
    };

    const baseline = await measure([]);
    const bracketed = await measure([layoutAnimation({ duration: 500 })]);

    // The axis rebuild is in both runs; the difference is the bracket alone.
    // This fixture's move crosses one row, so the span is that row plus the
    // anchor it stops at — 2 elements, measured before and after: **4 reads**.
    // A destination-view bracket would add 2 × 12; a span walked in the wrong
    // direction collects the rows on the other side instead, which is both
    // wrong and, here, 6.
    expect(baseline).toBeGreaterThan(0);
    // Bounded on both sides: a bracket that measures nothing is not a cheap
    // bracket, it is a broken one — a span walked in the wrong direction finds
    // no anchor and gives up.
    expect(bracketed - baseline).toBeGreaterThan(0);
    expect(bracketed - baseline).toBeLessThan(6);
  });

  it('should restore every touched row at teardown', async () => {
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);
    composed.controller.cancel('reason');

    expect(displaced(composed)).toEqual([]);
    expect(composed.items[1]!.style.transform).toBe('');
    expect(composed.items[2]!.style.transform).toBe('');
  });

  it('should not delay settlement while a displacement is running', async () => {
    // D-7: it has no `SettlementScope`, so it structurally cannot gate. The
    // drop finishes with the displacement still in flight.
    const composed = compose(layoutAnimation({ duration: 5000 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
  });

  it('should compose with landing without either gating the other', async () => {
    const composed = compose(
      layoutAnimation({ duration: 5000 }),
      landing({ duration: 1 }),
    );

    activate(composed);
    await drag(55);
    release(55);

    // Landing holds the gate; the displacement does not.
    expect(composed.finishes).toEqual([]);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });
});
