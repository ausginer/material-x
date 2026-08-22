/**
 * The minimal composition, driven through the **public entrypoint**:
 *
 * ```ts
 * sortable(root, { items: () => items }, y(), { onReorder })
 * ```
 *
 * Everything else in `tests/sortable` drives the behavior against hand-written
 * slot literals, which is what makes those suites able to force a specific
 * insertion or a specific failure. This one gives that up on purpose: the axis
 * rule is real, the geometry is real, and the only inputs are pointer events.
 * It is the first suite that can tell whether the *composed* thing works.
 *
 * Layout: three 40px items stacked from y=0, so the destination centres are 20,
 * 60 and 100. The top-layer lift takes the dragged item out of flow and the placeholder
 * inherits its box, so the list stays three boxes tall for the whole drag.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DraggableError } from '../../src/drag.ts';
import { AT_PROPOSAL } from '../../src/kernel/failures.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import { assemble } from '../../src/sortable/assemble.ts';
import { copyUniqueItems } from '../../src/sortable/collection.ts';
import {
  mergeFragments,
  type SortableConfig,
} from '../../src/sortable/config.ts';
import type {
  AxisInstaller,
  FeatureContext,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type ReorderRequest,
  type SortableController,
  type ReorderTransactionResult,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 12;
const ITEM_HEIGHT = 40;

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  requests: ReorderRequest[];
  finishes: ReorderTransactionResult[];
  cancels: ReorderTransactionResult[];
  errors: unknown[];
  started: HTMLElement[];
  placeholder(): HTMLElement | null;
  /** Swap the collection identity and signal it (D-44). */
  replace(next: readonly HTMLElement[]): void;
  /** DOM order, with the placeholder as `_` and the lifted item in place. */
  order(): string;
}>;

type Options = Readonly<{
  itemCount?: number;
  threshold?: number;
  onReorder?: SortableConfig['onReorder'];
  onStart?(composed: Composed): void;
  onFinish?(composed: Composed): void;
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

function compose(options: Options = {}): Composed {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.itemCount ?? 3); i += 1) {
    const item = document.createElement('div');

    item.textContent = `item ${i}`;
    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const requests: ReorderRequest[] = [];
  // **Two arrays for one callback** (D-62). The library no longer partitions
  // the four arms, so the fixture does — which keeps every assertion in this
  // suite reading the way it did and makes the split visible where it now
  // lives, in consumer code.
  const finishes: ReorderTransactionResult[] = [];
  const cancels: ReorderTransactionResult[] = [];
  const errors: unknown[] = [];
  const started: HTMLElement[] = [];

  let composed!: Composed;

  // **The pull source, and the array identity is the signal** (D-44). `current`
  // starts as `items` and is swapped wholesale by `replace()`; returning the
  // same array from a plain `invalidate()` is the geometry-only branch.
  let current: readonly HTMLElement[] = items;
  const controller = sortable(root, {
    items: () => current,
    axis: y(),
    onReorder:
      options.onReorder ??
      ((request) => {
        requests.push(request);
        return ReorderResolution.accept();
      }),
    onStart(item): void {
      started.push(item);
      options.onStart?.(composed);
    },
    onEnd(result): void {
      if (result.type === 'accepted' || result.type === 'noop') {
        finishes.push(result);
        options.onFinish?.(composed);
      } else {
        cancels.push(result);
      }
    },
    onError(error): void {
      errors.push(error);
    },
    ...(options.threshold === undefined
      ? null
      : { threshold: options.threshold }),
  });

  // Synthetic pointer events have no active pointer, so the real
  // `setPointerCapture` would throw `NotFoundError` for every activation.
  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  composed = {
    root,
    items,
    controller,
    requests,
    finishes,
    cancels,
    errors,
    started,
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
    /**
     * A structural update: new array identity, then the signal. This is what
     * `updateItems(next)` used to be, split into the two halves D-44 separates
     * — the consumer owns the collection, the library is only told to re-read.
     */
    replace: (next: readonly HTMLElement[]): void => {
      current = next;
      controller.invalidate();
    },
    order: () =>
      [...root.children]
        .map((child) => {
          const index = items.indexOf(child as HTMLElement);

          return index === -1 ? '_' : String(index);
        })
        .join(''),
  };

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

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

const move = (y: number): void => {
  pointerEvent('pointermove', y);
};

const release = (y: number): void => {
  pointerEvent('pointerup', y);
};

/** Runs the coalesced spatial frame the last committed move scheduled. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** Press the first item and cross the activation threshold. */
const activate = (composed: Composed, index = 0): void => {
  press(composed.items[index]!, index * ITEM_HEIGHT + 10);
  move(index * ITEM_HEIGHT + 30);
};

/** Move the pointer and let the coalesced frame resolve it. */
const drag = async (y: number): Promise<void> => {
  move(y);
  await nextFrame();
};

describe('the minimal composition', () => {
  it('should activate on a press that crosses the threshold', () => {
    const composed = compose();

    activate(composed);

    expect(composed.started).toEqual([composed.items[0]]);
    expect(composed.placeholder()).not.toBeNull();
  });

  it('should not activate before the threshold is crossed', () => {
    // The config owns the `threshold` default (D-56); nothing else may carry a
    // second copy.
    const composed = compose();

    press(composed.items[0]!);
    move(15);

    expect(composed.started).toEqual([]);
    expect(composed.placeholder()).toBeNull();
  });

  it('should honour a threshold the consumer set', () => {
    const composed = compose({ threshold: 100 });

    activate(composed);

    expect(composed.started).toEqual([]);
  });

  it('should give the placeholder the dragged item box', () => {
    const composed = compose();

    activate(composed);

    const placeholder = composed.placeholder()!;

    expect(placeholder.getBoundingClientRect().height).toBe(ITEM_HEIGHT);
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
  });

  it('should keep the gap when the pointer stays nearest its own slot', async () => {
    // The placeholder is a candidate, and that *is* the hysteresis: the gap
    // does not move until another centre is genuinely closer.
    const composed = compose();

    activate(composed);
    await drag(35);

    expect(composed.order()).toBe('0_12');
  });

  it('should move the gap once another centre is nearer', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);

    expect(composed.order()).toBe('01_2');
  });

  it('should move the gap to the end of the list', async () => {
    const composed = compose();

    activate(composed);
    await drag(110);

    expect(composed.order()).toBe('012_');
  });

  it('should return to an earlier gap when the pointer comes back', async () => {
    const composed = compose();

    activate(composed);
    await drag(110);
    await drag(15);

    expect(composed.order()).toBe('0_12');
  });
});

describe('the composed reorder round trip', () => {
  it('should propose the gap the pointer settled on', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.requests).toHaveLength(1);
    expect(composed.requests[0]).toMatchObject({
      item: composed.items[0],
      from: 0,
      to: 1,
      before: composed.items[1],
      after: composed.items[2],
    });
  });

  it('should finish an accepted reorder', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.finishes[0]!.type).toBe('accepted');
    expect(composed.cancels).toEqual([]);
  });

  it('should finish a drop that never left its own gap as a no-op', async () => {
    // A no-op drop finishes; it is never a rejection and never a home recovery.
    const composed = compose();

    activate(composed);
    await drag(35);
    release(35);

    expect(composed.requests).toEqual([]);
    expect(composed.finishes[0]!.type).toBe('noop');
  });

  it('should cancel a rejected reorder', async () => {
    const composed = compose({
      onReorder: () => ReorderResolution.reject('no'),
    });

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.cancels[0]).toMatchObject({
      type: 'rejected',
      reason: 'no',
    });
    expect(composed.finishes).toEqual([]);
  });

  it('should accept a resolution that arrives asynchronously', async () => {
    let settle!: (
      resolution: ReturnType<typeof ReorderResolution.accept>,
    ) => void;
    const composed = compose({
      onReorder: () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    });

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toEqual([]);

    settle(ReorderResolution.accept());
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });

  it('should classify a throwing onReorder as a resolution failure', async () => {
    const failure = new Error('resolver');
    const composed = compose({
      onReorder: () => {
        throw failure;
      },
    });

    activate(composed);
    await drag(55);
    release(55);

    // D-64: the consumer receives a coarse `DraggableError`, and the
    // classifying error survives as `cause` rather than being flattened.
    expect(composed.errors).toHaveLength(1);
    expect((composed.errors[0] as DraggableError).code).toBe('consumer');
    expect((composed.errors[0] as DraggableError).cause).toBe(failure);
  });

  it('should rebase a surviving gap onto a replacement', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);

    const extra = document.createElement('div');

    extra.style.height = `${ITEM_HEIGHT}px`;
    composed.root.append(extra);
    composed.replace([...composed.items, extra]);
    release(55);

    expect(composed.requests[0]).toMatchObject({ from: 0, to: 1, version: 1 });
  });

  it('should cancel when the replacement invalidates the gap', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    // The gap is between items 1 and 2; removing item 2 destroys it.
    composed.replace([composed.items[0]!, composed.items[1]!]);

    expect(composed.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: 'sortable:collection-invalidated',
    });
  });

  it('should cancel when the dragged item leaves the collection', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    composed.replace([composed.items[1]!, composed.items[2]!]);

    expect(composed.cancels[0]).toMatchObject({
      reason: 'sortable:item-removed',
    });
  });

  it('should apply an update dispatched from inside onStart', () => {
    // FIFO puts this ahead of the activation checkpoint, so it lands while the
    // phase is still ACTIVATING — handled, not deferred.
    const extra = document.createElement('div');
    const composed = compose({
      onStart: (self) => {
        self.root.append(extra);
        self.replace([...self.items, extra]);
      },
    });

    activate(composed);

    expect(composed.cancels).toEqual([]);
    expect(composed.placeholder()).not.toBeNull();
  });
});

describe('the composed terminal protocol', () => {
  it('should cancel an active drag on demand', () => {
    const composed = compose();

    activate(composed);
    composed.controller.cancel('gone');

    expect(composed.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: 'gone',
    });
    expect(composed.placeholder()).toBeNull();
  });

  it('should leave no placeholder and no inline transform behind', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.transform).toBe('');
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should stay usable for a second drag', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(2);
  });

  it('should tear down an in-flight drag on destroy', () => {
    const composed = compose();

    activate(composed);
    void composed.controller.destroy();

    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should ignore a press after destroy', () => {
    const composed = compose();

    void composed.controller.destroy();
    activate(composed);

    expect(composed.started).toEqual([]);
  });

  it('should settle a cancel from inside onStart as canceled', () => {
    // Once `onStart` has been delivered, exactly one terminal callback follows.
    // FIFO puts the cancel ahead of the activation checkpoint and the latch is
    // set synchronously, so the operation never reaches ACTIVE — but by then
    // the presentation exists and the consumer has been told a drag began, so
    // the cancellation settles rather than being abandoned.
    const composed = compose({
      onStart: (self) => {
        self.controller.cancel('immediately');
      },
    });

    activate(composed);

    expect(composed.started).toHaveLength(1);
    expect(composed.cancels).toEqual([
      {
        type: 'canceled',
        reason: 'immediately',
        stage: AT_PROPOSAL,
        // Named by the domain type: null when the operation was abandoned
        // before a proposal existed.
        proposal: null,
      },
    ]);
    expect(composed.finishes).toEqual([]);
    expect(composed.placeholder()).toBeNull();
  });

  it('should settle an invalidating update from inside onStart as canceled', () => {
    // The same invariant reached by the other route, and the one the ordering
    // fix is really about: the cancel is raised by the *collection action's
    // effect*, so it is queued behind `START_COMMITTED` rather than ahead of it.
    const composed = compose({
      onStart: (self) => {
        self.replace([self.items[1]!, self.items[2]!]);
      },
    });

    activate(composed);

    expect(composed.started).toHaveLength(1);
    expect(composed.cancels).toEqual([
      {
        type: 'canceled',
        reason: 'sortable:item-removed',
        stage: AT_PROPOSAL,
        proposal: null,
      },
    ]);
    expect(composed.placeholder()).toBeNull();
  });

  it('should destroy from inside onStart without leaving presentation behind', () => {
    const composed = compose({
      onStart: (self) => {
        void self.controller.destroy();
      },
    });

    activate(composed);

    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should ignore a second destroy', () => {
    // Terminal exactly once. Destroy tears down rather than settling, so it
    // notifies nothing either time — the consumer asked for the teardown.
    const composed = compose();

    activate(composed);
    void composed.controller.destroy();

    expect(() => {
      void composed.controller.destroy();
    }).not.toThrow();
    expect(composed.cancels).toEqual([]);
    expect(composed.finishes).toEqual([]);
  });

  it('should ignore a cancel that arrives after the drop settled', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);
    composed.controller.cancel('too late');

    expect(composed.finishes).toHaveLength(1);
    expect(composed.cancels).toEqual([]);
  });

  it('should tear down without a terminal callback when onReorder destroys', async () => {
    // Destroy is a teardown, not a settlement: the consumer asked for the
    // controller to stop existing, so the operation it was resolving does not
    // get to announce an outcome. The resolution it returned is dropped.
    let self!: Composed;
    const composed = compose({
      onReorder: () => {
        void self.controller.destroy();

        return ReorderResolution.accept();
      },
    });

    self = composed;

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toEqual([]);
    expect(composed.cancels).toEqual([]);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should apply work a callback queued before it threw', () => {
    // The queue is run-to-completion: the update was accepted the moment it was
    // dispatched, and losing it because a later statement in the same callback
    // threw would make queueing depend on the caller surviving.
    //
    // The throw itself lands on the **platform channel**, not `onError`. The
    // update invalidates the gap and latches a cancellation, and I-22 puts a
    // cancel above a failure checkpoint — so the classified failure is dropped
    // and the error is reported best-effort instead. That is the admitted
    // I-31 gap contract 02 records, reached here through the public surface.
    let self!: Composed;
    const composed = compose({
      onStart: () => {
        self.replace([self.items[0]!, self.items[2]!]);

        throw new Error('after queueing');
      },
    });

    self = composed;

    activate(composed);

    expect(composed.cancels).toHaveLength(1);
    expect(composed.errors).toEqual([]);
    expect(reported.map(String)).toEqual(['Error: after queueing']);
    expect(composed.placeholder()).toBeNull();
  });

  it('should tolerate a destroy from inside the terminal callback', async () => {
    // I-6's barrier reached from the last place it can be: the callback the
    // operation is retiring through.
    const composed = compose({
      onFinish: (self) => {
        void self.controller.destroy();
      },
    });

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
    expect(reported).toEqual([]);
  });

  it('should ignore a resolution that settles after a newer operation began', async () => {
    // F-25's shape without the cancel: the first operation is gone, a second
    // one is live, and the first consumer answers at last. The answer belongs
    // to an operation that no longer exists and must not touch this one.
    let resolve!: (value: ReorderResolution) => void;
    let first = true;
    const composed = compose({
      onReorder: () => {
        if (!first) {
          return ReorderResolution.accept();
        }

        first = false;

        return new Promise<ReorderResolution>((settle) => {
          resolve = settle;
        });
      },
    });

    activate(composed);
    await drag(55);
    release(55);
    composed.controller.cancel('abandoned');

    activate(composed);
    await drag(55);
    release(55);

    resolve(ReorderResolution.reject('too late'));
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.cancels).toHaveLength(1);
    expect(composed.cancels[0]).toMatchObject({ reason: 'abandoned' });
    expect(composed.finishes).toHaveLength(1);
  });

  it('should propose the same gap when the rows carry a CSS transition', async () => {
    // The matrix's "CSS layout transition" row. Authored transitions mean every
    // measured box is somewhere between its old and new place for the length of
    // the transition — the spatial resolver reads live geometry and must still
    // land on the gap the pointer is actually nearest.
    const composed = compose();

    for (const item of composed.items) {
      item.style.transition = 'translate 300ms linear, transform 300ms linear';
    }

    activate(composed);
    await drag(55);
    await drag(105);

    expect(composed.order()).toBe('012_');
  });

  it('should report nothing through the platform channel on a clean drag', async () => {
    const composed = compose();

    activate(composed);
    await drag(55);
    release(55);

    expect(reported).toEqual([]);
  });
});

/**
 * **Construction unwind, across construction** (D-80 (b), F-68, F-69; 05 §Test
 * matrix). The `assemble` suite pins the unwind *within* the assembler;
 * this group pins that nothing consumer-triggerable throws *outside* it.
 *
 * **Two of the four rows are negative controls, and they are the load-bearing
 * ones.** The pre-D-80 arrangement throws the same `TypeError`, with the same
 * message, at the same consumer call — only its position moved — so every
 * assertion that checks the throw alone passes against the defect. What
 * discriminates is *what the installers did before it*, which is why the
 * positive rows assert **no installer ran** rather than **every installer was
 * retired**, and why the two controls reconstruct the old orders and show them
 * failing exactly that assertion.
 */
describe('construction across the whole boundary', () => {
  type Probe = Readonly<{
    axis: AxisInstaller;
    /** Installers that ran, in installation order. */
    ran: string[];
    /** Installers whose `retire` ran. */
    retired: string[];
    plugin: SortableInstaller;
  }>;

  const probe = (): Probe => {
    const ran: string[] = [];
    const retired: string[] = [];

    return {
      ran,
      retired,
      axis: (context) => {
        ran.push('axis');
        return y()(context);
      },
      plugin: () => {
        ran.push('plugin');
        return {
          retire: (): void => {
            retired.push('plugin');
          },
        };
      },
    };
  };

  const host = (): HTMLElement => {
    const root = document.createElement('div');

    document.body.append(root);
    cleanup.push(() => root.remove());

    return root;
  };

  it('should refuse a duplicated element before any installer runs', () => {
    const parts = probe();
    const root = host();
    const item = document.createElement('div');

    root.append(item);

    expect(() =>
      sortable(root, {
        items: () => [item, item],
        onReorder: () => ReorderResolution.accept(),
        axis: parts.axis,
        plugins: [parts.plugin],
      }),
    ).toThrow(/same element twice/u);

    // **Not `retired` — `ran`.** A wider bracket would also leave `retired`
    // equal to `['plugin']`, and the two arrangements are indistinguishable by
    // that assertion. Nothing ran, so there is nothing to unwind.
    expect(parts.ran).toEqual([]);
    expect(parts.retired).toEqual([]);
  });

  it('should refuse a throwing pull source before any installer runs', () => {
    // F-69's case. The throw comes from the consumer's own `items()`, which
    // used to be safe only because it sat left of `assemble(…)` in one
    // argument list.
    const parts = probe();
    const root = host();

    expect(() =>
      sortable(root, {
        items: () => {
          throw new TypeError('consumer pull');
        },
        onReorder: () => ReorderResolution.accept(),
        axis: parts.axis,
        plugins: [parts.plugin],
      }),
    ).toThrow(/consumer pull/u);

    expect(parts.ran).toEqual([]);
  });

  it('should retire every installer it ran when the controller is destroyed', () => {
    // The other end of the same property: construction that survives to a
    // controller still owns its hooks, so "nothing was stranded" is not
    // achieved by never recording anything.
    const parts = probe();
    const root = host();
    const item = document.createElement('div');

    root.append(item);

    const controller = sortable(root, {
      items: () => [item],
      onReorder: () => ReorderResolution.accept(),
      axis: parts.axis,
      plugins: [parts.plugin],
    });

    expect(parts.ran).toEqual(['axis', 'plugin']);
    expect(parts.retired).toEqual([]);

    return controller.destroy().then(() => {
      expect(parts.retired).toEqual(['plugin']);
    });
  });

  it('should be discriminated by the pre-D-80 validation position', () => {
    // **Negative control.** Validating inside `install` — where
    // `createSortableRuntime` did it — reconstructed here as: assemble first,
    // validate second. The throw is identical; what differs is that the
    // installers have already run and their hooks are held by a record nothing
    // will unwind, because `arm()` is never reached.
    const parts = probe();
    const root = document.createElement('div');
    const item = document.createElement('div');
    const context: FeatureContext = {
      realm: createRealm(root),
      root,
      report: (): void => {},
    };
    const config: SortableConfig = {
      items: () => [item, item],
      onReorder: () => ReorderResolution.accept(),
      axis: parts.axis,
      plugins: [parts.plugin],
    };

    expect(() => {
      const slots = assemble(mergeFragments(config, []), context);

      void slots;
      copyUniqueItems(config.items());
    }).toThrow(/same element twice/u);

    // The assertion the shipped order satisfies is the one this fails.
    expect(parts.ran).toEqual(['axis', 'plugin']);
    expect(parts.retired).toEqual([]);
  });

  it('should be discriminated by the pre-D-80 argument order', () => {
    // **Negative control for F-69.** The pull and the assembly as sibling
    // arguments, evaluated right to left — the swap no reviewer would flag,
    // because neither argument reads as ordered.
    const parts = probe();
    const root = document.createElement('div');
    const context: FeatureContext = {
      realm: createRealm(root),
      root,
      report: (): void => {},
    };
    const config: SortableConfig = {
      items: () => {
        throw new TypeError('consumer pull');
      },
      onReorder: () => ReorderResolution.accept(),
      axis: parts.axis,
      plugins: [parts.plugin],
    };
    const sibling = (
      slots: unknown,
      items: readonly HTMLElement[],
    ): unknown => [slots, items];

    expect(() =>
      sibling(assemble(mergeFragments(config, []), context), config.items()),
    ).toThrow(/consumer pull/u);

    expect(parts.ran).toEqual(['axis', 'plugin']);
    expect(parts.retired).toEqual([]);
  });
});

/**
 * **B-9 (c), through the public entry** (P18A-15). The clause's own framing is
 * a statement about `sortable()` — a later `Partial` carrying `axis: undefined`
 * is a legal value, and the merge's `undefined` skip is the only thing between
 * it and a required slot that is `undefined` at the seam. Every assertion for
 * it called `mergeFragments` directly, so a change that stopped routing
 * `sortable()`'s fragments through the merge, or that reordered the required
 * argument against the fragments, would have left them all green.
 *
 * The positive row is what stops the negative one passing vacuously: if the
 * fragments never reached the merge at all, "the slot survived" would be true
 * for the wrong reason.
 */
describe('the required first argument, through the public entry', () => {
  const mount = (): Readonly<{ root: HTMLElement; item: HTMLElement }> => {
    const root = document.createElement('div');
    const item = document.createElement('div');

    root.append(item);
    document.body.append(root);
    cleanup.push(() => root.remove());

    return { root, item };
  };

  const base = (item: HTMLElement): SortableConfig => ({
    items: () => [item],
    onReorder: () => ReorderResolution.accept(),
    axis: y(),
  });

  it('should let a later fragment through to the merge', () => {
    const { root, item } = mount();
    const ran: string[] = [];
    const replacement: AxisInstaller = (context) => {
      ran.push('replacement');
      return y()(context);
    };

    const controller = sortable(root, base(item), { axis: replacement });

    cleanup.push(() => void controller.destroy());
    expect(ran).toEqual(['replacement']);
  });

  it('should not let a later fragment clear a required slot', () => {
    // `axis: undefined` is a legal `Partial` value the compiler accepts. If the
    // skip went, the assembler would dereference a resolver that is not there
    // and this construction would throw.
    const { root, item } = mount();

    const controller = sortable(root, base(item), {
      axis: undefined,
      items: undefined,
      onReorder: undefined,
    });

    cleanup.push(() => void controller.destroy());
    expect(controller.invalidate).toBeTypeOf('function');
  });
});
