import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DraggableError,
  type DraggableErrorCode,
  DraggableWarning,
} from '../../src/drag.ts';
import { toDraggableError } from '../../src/kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_ADMISSION,
  FAILURE_RELEASE,
} from '../../src/kernel/failures.ts';
import {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  RELEASING,
  SETTLING,
} from '../../src/kernel/phases.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import {
  type LandingHandle,
  type LandingStart,
  SETTLED_FULFILLED,
} from '../../src/kernel/spec.ts';
import { draggable } from '../../src/kernel.ts';
import { createSortableBehavior } from '../../src/sortable/behavior.ts';
import type { SortableController } from '../../src/sortable/controller.ts';
import {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  RECOVERY_DESTINATION,
  ReorderResolution,
  type ReorderRequest,
  type ReorderTransactionResult,
} from '../../src/sortable/domain.ts';
import { createSortableFramePart } from '../../src/sortable/frames.ts';
import {
  createSortableRuntime,
  TAG_SPATIAL,
} from '../../src/sortable/runtime.ts';
import type {
  DisplacementView,
  InsertionFrameView,
  InsertionRuntimeView,
  SortableSlots,
} from '../../src/sortable/slots.ts';
import { createSortableSpec, STAGED } from '../../src/sortable/spec.ts';

const POINTER_ID = 11;
const ITEM_HEIGHT = 40;

type Harness = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  /** Seams, hooks and callbacks, in order. */
  calls: string[];
  finishes: ReorderTransactionResult[];
  cancels: ReorderTransactionResult[];
  errors: Array<Readonly<{ code: DraggableErrorCode; error: unknown }>>;
  requests: ReorderRequest[];
  /** The item each `onStart` received. */
  started: HTMLElement[];
  /** What the next `resolveInsertion` returns. Consumed once. */
  next(insertion: Insertion | null): void;
  /** The insertion for a destination gap index, against the live snapshot. */
  gap(index: number, dragged?: HTMLElement): Insertion;
  placeholder(): HTMLElement | null;
  snapshot(): CollectionSnapshot;
  /** Swap the collection identity and signal it (D-44). */
  replace(next: readonly HTMLElement[]): void;
}>;

type Overrides = Partial<
  Pick<
    SortableSlots,
    | 'onReorder'
    | 'getHandle'
    | 'getVisual'
    | 'getBox'
    | 'createPlaceholder'
    | 'invalidateInsertion'
    | 'measureInsertion'
    | 'startLanding'
    | 'beforeMove'
    | 'afterMove'
    | 'retireHooks'
    | 'threshold'
  >
> &
  Readonly<{
    /** Runs inside `onStart`, so a test can cancel, destroy or update. */
    onStart?(harness: Harness): void;
    /**
     * Runs inside `onFinish`, for the one case that needs a **throwing**
     * terminal callback: D-66's exclusion of `FAILURE_TERMINAL_CALLBACK` from
     * the failure path's publish.
     */
    onFinish?(): void;
    itemCount?: number;
    /**
     * Wraps the pull source, for the one case that needs a **throwing**
     * `items()`: the consumer's own code raising inside
     * `action.prepare(COLLECTION)` is the only way left for a pull to produce
     * no collection (D-121).
     */
    pull?(items: readonly HTMLElement[]): readonly HTMLElement[];
  }>;

const cleanup: Array<() => void> = [];

/**
 * **Everything the library surfaced, in arrival order** (D-130). ~~A
 * `globalThis.reportError` stub.~~ One channel, so this is fed by the harness's
 * own `onError` — the same callback `errors` reads, kept separate only because
 * `errors` projects to a `code` and half this population has none.
 */
let reported: Array<DraggableError | DraggableWarning> = [];

beforeEach(() => {
  reported = [];
});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function createHarness(overrides: Overrides = {}): Harness {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (overrides.itemCount ?? 3); i += 1) {
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

  const calls: string[] = [];
  // **One callback, two arrays** (D-62). The `calls` log keeps the old names
  // because they are what every assertion in this suite reads, and because
  // `onFinish`/`onCancel` remain the honest labels for *which arm* was
  // published — they are simply no longer the names of two library callbacks.
  const finishes: ReorderTransactionResult[] = [];
  const cancels: ReorderTransactionResult[] = [];
  const errors: Array<Readonly<{ code: DraggableErrorCode; error: unknown }>> =
    [];
  const requests: ReorderRequest[] = [];
  const started: HTMLElement[] = [];

  let queued: Insertion | null = null;
  let published: CollectionSnapshot = { items: [...items], version: 0 };
  // **The pull source** (D-44). Swapped wholesale by `replace()`; a bare
  // `controller.invalidate()` returns the same identity and takes the
  // geometry-only branch.
  let current: readonly HTMLElement[] = items;

  let harness!: Harness;

  const slots: SortableSlots = {
    items: overrides.pull
      ? (): readonly HTMLElement[] => overrides.pull!(current)
      : () => current,
    measureInsertion: overrides.measureInsertion ?? null,
    resolveInsertion(
      _frame: InsertionFrameView,
      runtime: InsertionRuntimeView,
    ): Insertion | null {
      calls.push('resolveInsertion');
      // Recorded so a test can prove the per-operation view is published with a
      // non-null placeholder before anything resolves against it.
      expect(runtime.placeholder).toBeInstanceOf(HTMLElement);
      published = runtime.snapshot;

      const insertion = queued;

      queued = null;
      return insertion;
    },
    invalidateInsertion:
      overrides.invalidateInsertion ??
      ((): void => {
        calls.push('invalidateInsertion');
      }),
    onReorder:
      overrides.onReorder ??
      ((request) => {
        calls.push('onReorder');
        requests.push(request);
        return ReorderResolution.accept();
      }),
    onStart(item): void {
      calls.push('onStart');
      started.push(item);
      overrides.onStart?.(harness);
    },
    createPlaceholder: overrides.createPlaceholder ?? null,
    getHandle: overrides.getHandle ?? null,
    getVisual: overrides.getVisual ?? null,
    // D-43's default applied the way the assembler applies it: `box` falls back
    // to `visual`, so a fixture that overrides only `visual` still measures its
    // candidates on the same element the placeholder is sized from.
    getBox: overrides.getBox ?? overrides.getVisual ?? null,
    startLanding: overrides.startLanding ?? null,
    onEnd(result): void {
      if (result.type === 'accepted' || result.type === 'noop') {
        calls.push('onFinish');
        finishes.push(result);
        overrides.onFinish?.();
      } else {
        calls.push('onCancel');
        cancels.push(result);
      }
    },
    onError(error): void {
      reported.push(error);

      // **A warning is not a failure** (D-130). `calls` and `errors` are the
      // *consequential* population — the rows that assert a fault ended or
      // changed an operation — so an advisory notification joins `reported`
      // alone. Without the split every teardown diagnostic would show up as a
      // phantom `onError` in a callback-order assertion.
      if (!(error instanceof DraggableError)) {
        return;
      }

      calls.push('onError');
      // D-64: the consumer sees a coarse fault class, never a pipeline stage.
      errors.push({ code: error.code, error });
    },
    beforeMove: overrides.beforeMove ?? [],
    afterMove: overrides.afterMove ?? [],
    retireHooks: overrides.retireHooks ?? [],
    threshold: overrides.threshold ?? 8,
  };

  const controller = draggable(root, createSortableBehavior(items, slots));

  // Synthetic pointer events have no active pointer, so the real
  // `setPointerCapture` would throw `NotFoundError` for every activation.
  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  harness = {
    root,
    items,
    controller,
    calls,
    finishes,
    cancels,
    errors,
    requests,
    started,
    next(insertion): void {
      queued = insertion;
    },
    gap(index, dragged = items[0]!): Insertion {
      const destination = published.items.filter((item) => item !== dragged);

      return {
        version: published.version,
        index,
        before: destination[index - 1] ?? null,
        after: destination[index] ?? null,
      };
    },
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
    snapshot: () => published,
    /** New array identity, then the signal — D-44's structural branch. */
    replace: (next: readonly HTMLElement[]): void => {
      current = next;
      controller.invalidate();
    },
  };

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return harness;
}

const press = (target: HTMLElement, x = 10, y = 10): PointerEvent => {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: POINTER_ID,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y,
  });

  target.dispatchEvent(event);
  return event;
};

const pointerEvent = (type: string, x: number, y: number): PointerEvent => {
  const event = new PointerEvent(type, {
    bubbles: true,
    // Real `pointermove` and `pointerup` are cancelable, and since D-54 the
    // library's own `preventDefault()` lands on a *move* — so the flag has to
    // be here or the assertion would read a value the browser never produces.
    cancelable: true,
    pointerId: POINTER_ID,
    isPrimary: true,
    clientX: x,
    clientY: y,
  });

  document.dispatchEvent(event);
  return event;
};

const move = (y: number): PointerEvent => pointerEvent('pointermove', 10, y);

const release = (y: number): PointerEvent => pointerEvent('pointerup', 10, y);

/** Press the first item, then cross the activation threshold. */
const activate = (harness: Harness): void => {
  press(harness.items[0]!);
  move(40);
};

/** Runs the coalesced spatial frame the last `moved` scheduled. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/**
 * A landing runner that holds the gate open, so a test can observe the DOM
 * while presentation is still owned — the join removes the placeholder and
 * restores the inline styles the moment both gates complete.
 */
function createRunner(): Readonly<{ start: LandingStart; done(): void }> {
  let complete: (() => void) | null = null;

  return {
    start(_context, done): LandingHandle {
      complete = done;
      return { destroy: (): void => {} };
    },
    done(): void {
      complete!();
    },
  };
}

/**
 * A placeholder element that runs a test hook from `connectedCallback` — the
 * synchronous reentrancy window inside `item.after(placeholder)`. Registered
 * once, because a custom element name cannot be redefined.
 */
const REENTRANT_PLACEHOLDER = 'drag2-reentrant-placeholder';

let reentrantPlaceholderConnected: ((element: HTMLElement) => void) | null =
  null;

customElements.define(
  REENTRANT_PLACEHOLDER,
  class extends HTMLElement {
    connectedCallback(): void {
      reentrantPlaceholderConnected?.(this);
    }
  },
);

afterEach(() => {
  reentrantPlaceholderConnected = null;
});

/** The minimum a behavior needs; used where construction itself is the test. */
const EMPTY_SLOTS: SortableSlots = {
  resolveInsertion: () => null,
  invalidateInsertion: (): void => {},
  measureInsertion: null,
  items: (): readonly HTMLElement[] => [],
  onReorder: () => ReorderResolution.accept(),
  onStart: (): void => {},
  createPlaceholder: null,
  getHandle: null,
  getVisual: null,
  getBox: null,
  startLanding: null,
  onEnd: (): void => {},
  onError: (): void => {},
  beforeMove: [],
  afterMove: [],
  retireHooks: [],
  threshold: 8,
};

/** The item order in the DOM, placeholder included as `_`. */
const order = (harness: Harness): string =>
  [...harness.root.children]
    .map((child) => {
      const index = harness.items.indexOf(child as HTMLElement);

      return index === -1 ? '_' : String(index);
    })
    .join('');

describe('admission', () => {
  it('should resolve the pressed item from the composed path', () => {
    const harness = createHarness();
    const inner = document.createElement('span');

    harness.items[1]!.append(inner);
    press(inner);
    move(40);

    expect(harness.calls).toContain('onStart');
  });

  it('should ignore a press outside the collection', () => {
    const harness = createHarness();

    press(harness.root);
    move(40);

    expect(harness.calls).toEqual([]);
  });

  it('should not preventDefault on an admitted press', () => {
    // **D-54.** Admission fires on `pointerdown`, which is before the
    // activation threshold, so the set of events the kernel prevents is not the
    // set of events that become drags. Preventing here spends the press — the
    // focus, the caret, the form-control operation — on a drag that has not
    // happened and may never happen.
    const harness = createHarness();
    const admitted = press(harness.items[0]!);

    expect(admitted.defaultPrevented).toBe(false);

    harness.controller.cancel('reset');

    const ignored = press(harness.root);

    expect(ignored.defaultPrevented).toBe(false);
  });

  it('should preventDefault on the move that crosses the threshold', () => {
    const harness = createHarness();

    press(harness.items[0]!);

    const crossing = move(40);

    expect(crossing.defaultPrevented).toBe(true);
  });

  it('should not preventDefault on a move that stays below the threshold', () => {
    const harness = createHarness();

    press(harness.items[0]!);

    // Below `DEFAULT_THRESHOLD`, so the press is still a press: nothing is
    // prevented and the native gesture is intact.
    const short = move(13);

    expect(short.defaultPrevented).toBe(false);
    expect(harness.started).toEqual([]);
  });

  it('should not preventDefault on moves after the crossing', () => {
    // The call is the *crossing's*, not every sample's: once `ACTIVE`, the
    // pointer is captured and the hot path does nothing but render.
    const harness = createHarness();

    press(harness.items[0]!);
    move(40);

    expect(move(60).defaultPrevented).toBe(false);
  });

  it('should narrow admission through the handle slot', () => {
    const handle = document.createElement('span');
    const harness = createHarness({
      getHandle: (item) => (item.firstElementChild as HTMLElement) ?? null,
    });

    harness.items[0]!.append(handle);

    // The press missed the handle.
    press(harness.items[0]!);
    move(40);
    expect(harness.calls).toEqual([]);

    // It landed on it.
    press(handle);
    move(40);
    expect(harness.calls).toContain('onStart');
  });

  it('should lift the visual without replacing the item', () => {
    const harness = createHarness({
      getVisual: (item) => item.firstElementChild as HTMLElement,
    });
    const visual = document.createElement('div');

    visual.style.height = '20px';
    harness.items[0]!.append(visual);

    activate(harness);

    // The placeholder is inserted after the **item**, and is sized from the
    // visual: a handle or visual slot narrows what is lifted, never what is
    // sorted.
    expect(harness.placeholder()!.previousElementSibling).toBe(
      harness.items[0],
    );
    expect(harness.placeholder()!.style.height).toBe('20px');
  });
});

describe('the admission queue boundary', () => {
  /**
   * A resolver that runs `act` on the first press only. `getHandle` and
   * `getVisual` are the two consumer callbacks admission invokes, and both run
   * inside the native `pointerdown` dispatch — before anything is committed.
   */
  const once = (act: () => void): (() => void) => {
    let done = false;

    return () => {
      if (done) {
        return;
      }

      done = true;
      act();
    };
  };

  it('should apply a replacement dispatched from the handle resolver after admission commits', () => {
    let harness!: Harness;
    const replace = once(() => {
      harness.replace([...harness.items]);
    });

    harness = createHarness({
      getHandle(item) {
        replace();
        return item;
      },
    });

    activate(harness);
    release(40);

    // The action must land *after* the admission transaction, not underneath
    // it: draining inside `admit` swaps the frame pair mid-write, so the
    // committed operation ends up with no item and no snapshot and activation
    // fails instead of starting.
    expect(harness.calls).toContain('onStart');
    expect(harness.snapshot().version).toBe(1);
  });

  it('should apply a replacement dispatched from the visual resolver', () => {
    let harness!: Harness;
    const replace = once(() => {
      harness.replace([...harness.items]);
    });

    harness = createHarness({
      getVisual(item) {
        replace();
        return item;
      },
    });

    activate(harness);
    release(40);

    expect(harness.calls).toContain('onStart');
    expect(harness.snapshot().version).toBe(1);
  });

  it('should rebase the drag onto a collection replaced during admission', () => {
    let harness!: Harness;
    const replace = once(() => {
      harness.replace([...harness.items].reverse());
    });

    harness = createHarness({
      getHandle(item) {
        replace();
        return item;
      },
    });

    activate(harness);

    // The pressed item is last in the replacement, so its home index is 2. A
    // proposal built against the pre-admission collection would say 0.
    const reversed = [...harness.items].reverse();

    harness.next({ version: 1, index: 0, before: null, after: reversed[0]! });
    release(40);

    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0]!.from).toBe(2);
    expect(harness.requests[0]!.to).toBe(0);
  });

  it('should retire the operation when the replacement removes the pressed item', () => {
    let harness!: Harness;
    const replace = once(() => {
      harness.replace(harness.items.slice(1));
    });

    harness = createHarness({
      getHandle(item) {
        replace();
        return item;
      },
    });

    press(harness.items[0]!);

    // Abandoned at `PENDING`, which is silent: `admit` is not a start
    // notification, so there is nothing to report a terminal callback for.
    expect(harness.calls).toEqual([]);
    expect(harness.placeholder()).toBeNull();

    // And retired *within the press*, not lazily on whatever event happens to
    // drain next: an operation still sitting at `PENDING` would refuse the
    // press below, because the controller already holds one.
    press(harness.items[1]!);
    move(40);
    expect(harness.started).toEqual([harness.items[1]!]);
  });

  it('should apply several queued replacements in dispatch order', () => {
    let harness!: Harness;
    const replace = once(() => {
      harness.replace(harness.items.slice(0, 2));
      harness.replace([...harness.items]);
    });

    harness = createHarness({
      getHandle(item) {
        replace();
        return item;
      },
    });

    activate(harness);
    release(40);

    // **Two signals, one structural application — and that is the pull source,
    // not a collapse the library chose** (D-44). Both actions queue and both
    // drain; the first pulls and sees the identity the *second* `replace`
    // already installed, so it publishes the final collection. The second pulls
    // the same array again, matches `rt.source`, and takes the geometry-only
    // branch.
    //
    // Under `updateItems(payload)` this was version 2, because each call
    // carried its own snapshot and the library applied both. A pull source
    // reads current state at apply time rather than at signal time, so an
    // intermediate collection the consumer has already moved past is never
    // published — which is the property, not a lost update.
    expect(harness.snapshot().version).toBe(1);
    expect(harness.snapshot().items).toEqual(harness.items);
  });

  it('should refuse a nested press dispatched from the handle resolver', () => {
    // A resolver runs inside `admit`, before anything is committed — so the
    // ordinary "already have an operation" guard sees `null` and would wave a
    // second `pointerdown` straight through. The nested pass would rebuild the
    // draft the outer `admit` holds by reference, mint its own identity and
    // commit its own origin; the outer `admit` would then finish writing its
    // item into what is now the committed frame, publishing one press's
    // coordinates with the other's behavior state.
    let harness!: Harness;
    const nest = once(() => {
      press(harness.items[1]!, 10, 200);
    });

    harness = createHarness({
      getHandle(item) {
        nest();
        return item;
      },
    });

    press(harness.items[0]!, 10, 10);
    move(40);
    move(80);

    // Behavior state is the outer press's...
    expect(harness.started).toEqual([harness.items[0]!]);
    expect(harness.placeholder()!.previousElementSibling).toBe(
      harness.items[0],
    );
    // ...and so is the origin every later sample is measured against: 80 − 10,
    // not 80 − 200.
    expect(harness.items[0]!.style.transform).toContain('70px');
  });

  it('should refuse a nested press dispatched from the visual resolver', () => {
    let harness!: Harness;
    const nest = once(() => {
      press(harness.items[1]!, 10, 200);
    });

    harness = createHarness({
      getVisual(item) {
        nest();
        return item;
      },
    });

    press(harness.items[0]!, 10, 10);
    move(40);
    move(80);

    expect(harness.started).toEqual([harness.items[0]!]);
    expect(harness.items[0]!.style.transform).toContain('70px');
  });

  it('should still admit the next press after refusing a nested one', () => {
    // Refused, not latched: the boundary is per-admission, so the controller is
    // untouched afterwards.
    let harness!: Harness;
    const nest = once(() => {
      press(harness.items[1]!, 10, 200);
    });

    harness = createHarness({
      getHandle(item) {
        nest();
        return item;
      },
    });

    press(harness.items[0]!, 10, 10);
    move(40);
    release(40);

    press(harness.items[2]!, 10, 90);
    move(120);

    expect(harness.started).toEqual([harness.items[0]!, harness.items[2]!]);
  });

  it('should treat destroy from the handle resolver as an immediate terminal barrier', () => {
    let harness!: Harness;
    const terminate = once(() => {
      void harness.controller.destroy();
      // Queued behind a closed queue: it must never be drained.
      harness.replace([...harness.items].reverse());
    });

    harness = createHarness({
      getHandle(item) {
        terminate();
        return item;
      },
    });

    activate(harness);

    expect(harness.calls).toEqual([]);
    expect(harness.placeholder()).toBeNull();

    // Terminal exactly once and for good: nothing admits afterwards.
    press(harness.items[1]!);
    move(40);
    expect(harness.calls).toEqual([]);
  });

  it('should classify a throwing visual resolver as a consumer fault', async () => {
    // **D-84's sortable half, which was stated for both behaviors and pinned in
    // only one** (CE1-07). The decision reads *a throwing `visual` resolver is
    // `FAILURE_ADMISSION` (1) → `consumer`, in both behaviors* — free drag
    // calls the resolver inside `admit`, the sortable inside `seedDraft`,
    // admission's second half — and every sortable `visual` row asserted the
    // *destroy* barrier instead, which is a different property. A claim whose
    // only test lives in the other behavior is, for this behavior,
    // indistinguishable from an unasserted one (F-74).
    //
    // The code was already right; what was missing was the instrument. The
    // coarse code is read from the kernel's own mapping rather than retyped, so
    // a remap fails here instead of agreeing with a stale literal.
    const harness = createHarness({
      getVisual(): HTMLElement {
        throw new Error('visual: broken');
      },
    });

    activate(harness);
    await Promise.resolve();

    expect(harness.errors.map((entry) => entry.code)).toEqual([
      toDraggableError(FAILURE_ADMISSION, null).code,
    ]);
    // Admission runs before an operation identity exists, so there is nothing
    // to settle and no terminal is owed (Q-1, D-83) — `onError` is the only
    // call, which is what makes this the admission row rather than an
    // activation one.
    expect(harness.calls).toEqual(['onError']);
    // **One channel, so the whole population is one array** (D-130). This read
    // `expect(reported).toEqual([])` against a second destination; what it can
    // still say is that the consequential report is the *only* thing that
    // arrived — no advisory notification rode along with it.
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(DraggableError);
  });

  it('should treat destroy from the visual resolver as an immediate terminal barrier', () => {
    let harness!: Harness;
    const terminate = once(() => {
      void harness.controller.destroy();
      harness.replace([...harness.items].reverse());
    });

    harness = createHarness({
      getVisual(item) {
        terminate();
        return item;
      },
    });

    activate(harness);

    expect(harness.calls).toEqual([]);
    expect(harness.placeholder()).toBeNull();

    press(harness.items[1]!);
    move(40);
    expect(harness.calls).toEqual([]);
  });
});

describe('activation', () => {
  it('should create the placeholder detached and insert it after the item', () => {
    const created: HTMLElement[] = [];
    const harness = createHarness({
      createPlaceholder({ item, visual, rect }): HTMLElement {
        const element = document.createElement('div');

        // `prepare` may not touch the DOM: the element it returns is detached,
        // and the kernel has not committed anything yet.
        expect(item).toBe(harness.items[0]);
        expect(visual).toBe(harness.items[0]);
        expect(rect.height).toBe(ITEM_HEIGHT);
        created.push(element);
        expect(element.isConnected).toBe(false);
        return element;
      },
    });

    activate(harness);

    expect(created).toHaveLength(1);
    expect(created[0]!.isConnected).toBe(true);
    expect(created[0]!.previousElementSibling).toBe(harness.items[0]);
  });

  it('should apply the default mechanics to a customised placeholder', () => {
    const harness = createHarness({
      createPlaceholder: () => document.createElement('section'),
    });

    harness.items[0]!.setAttribute('slot', 'row');
    activate(harness);

    const placeholder = harness.placeholder()!;

    // Not configurable away, whoever created the element.
    expect(placeholder.tagName).toBe('SECTION');
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder.getAttribute('slot')).toBe('row');
    expect(placeholder.style.height).toBe(`${ITEM_HEIGHT}px`);
  });

  it('should publish the runtime before onStart runs', () => {
    let seen: string[] = [];
    const harness = createHarness({
      onStart(each): void {
        // I-30: every resource is owned and every private reference published
        // before a consumer callback can cancel or destroy.
        seen = [...each.calls];
        expect(each.placeholder()).not.toBeNull();
      },
    });

    activate(harness);

    expect(seen).toContain('invalidateInsertion');
  });

  it('should not activate when the item left the collection', () => {
    const harness = createHarness();

    press(harness.items[0]!);
    harness.replace([harness.items[1]!, harness.items[2]!]);
    move(40);

    // The press is already cancelled by the item-removed reason, so activation
    // never runs; the discard would refuse it anyway.
    expect(harness.calls).not.toContain('onStart');
  });

  it('should stop when the placeholder insertion destroyed the controller', () => {
    // `after()` connects the placeholder, and a custom element's
    // `connectedCallback` runs synchronously *inside* that call — the one point
    // in activation where consumer code interleaves with a DOM write the kernel
    // has no other guard around.
    let harness: Harness | null = null;

    harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (): void => {
      void harness.controller.destroy();
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.placeholder()).toBeNull();
    expect(harness.root.querySelector(REENTRANT_PLACEHOLDER)).toBeNull();
  });

  it('should fail activation when the placeholder removes itself on connection', () => {
    // The same window as the reentrant destroy above, used differently: the
    // controller survives, so nothing downstream knows the footprint is gone.
    // Everything after this point assumes the insertion took — `placeholderAt`
    // reads siblings, the landing measures a rect — so it is checked, not
    // assumed.
    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (element): void => {
      element.remove();
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.errors).toHaveLength(1);
    expect(harness.errors[0]!.code).toBe('interaction');
    expect(harness.placeholder()).toBeNull();
  });

  it('should fail activation when the placeholder reparents itself on connection', () => {
    const foreign = document.createElement('div');

    document.body.append(foreign);
    cleanup.push(() => {
      foreign.remove();
    });

    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (element): void => {
      foreign.append(element);
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.errors[0]!.code).toBe('interaction');
    // Still connected, but not in the list — and teardown owns it either way.
    expect(foreign.children).toHaveLength(0);
  });

  it('should fail activation when the whole list leaves the document', () => {
    // Adjacency survives — the placeholder is still the item's next sibling —
    // and only connectivity breaks. A drag against a detached tree measures
    // rects that are all zero, so it is refused rather than started.
    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (): void => {
      harness.root.remove();
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.errors[0]!.code).toBe('interaction');
  });

  it('should fail activation when the placeholder moves within the container', () => {
    // Connectivity holds and so does parentage; only adjacency breaks. The
    // placeholder stands for *this item's* slot, and at the head of the list it
    // no longer does — every later gap decision is read from its siblings.
    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (element): void => {
      harness.root.prepend(element);
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.errors[0]!.code).toBe('interaction');
  });

  it('should fail activation when the item is reparented away from the placeholder', () => {
    // Connectivity and parentage both hold here; only adjacency breaks. The
    // placeholder stands for *this item's* slot, and it no longer does.
    const foreign = document.createElement('div');

    document.body.append(foreign);
    cleanup.push(() => {
      foreign.remove();
    });

    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (): void => {
      foreign.append(harness.items[0]!);
    };

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
    expect(harness.errors[0]!.code).toBe('interaction');
  });

  it('should start normally when the placeholder survives connection', () => {
    // The check must not refuse an ordinary custom-element placeholder that
    // does something harmless on connection.
    const connected: HTMLElement[] = [];
    const harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (element): void => {
      element.dataset['ready'] = 'yes';
      connected.push(element);
    };

    activate(harness);

    expect(connected).toHaveLength(1);
    expect(harness.errors).toEqual([]);
    expect(harness.calls).toContain('onStart');
  });

  it('should not republish runtime state after a reentrant destruction', () => {
    // The runtime slots are private, so the observable is what they *cause*:
    // `invalidateInsertion` is called immediately after the view is published,
    // and no scheduled frame or hook may run for a retired operation.
    let harness: Harness | null = null;

    harness = createHarness({
      createPlaceholder: (): HTMLElement =>
        document.createElement(REENTRANT_PLACEHOLDER),
    });

    reentrantPlaceholderConnected = (): void => {
      void harness.controller.destroy();
    };

    activate(harness);
    move(80);

    expect(harness.calls).not.toContain('invalidateInsertion');
    expect(harness.calls).not.toContain('resolveInsertion');
  });
});

describe('the hot path', () => {
  it('should render the committed sample and coalesce the spatial search', async () => {
    const harness = createHarness();

    activate(harness);
    harness.calls.length = 0;

    move(60);
    move(80);
    move(100);

    // Three samples, one frame: pointer input never coalesces, the spatial
    // search always does.
    expect(harness.calls).toEqual([]);
    expect(harness.items[0]!.style.transform).toContain('90px');

    await nextFrame();
    expect(
      harness.calls.filter((name) => name === 'resolveInsertion'),
    ).toHaveLength(1);
  });

  it('should not commit an insertion the resolver declined', async () => {
    const harness = createHarness();

    activate(harness);
    const before = order(harness);

    harness.next(null);
    move(60);
    await nextFrame();

    // The incumbent stays authoritative until a genuinely better gap is
    // selected; a frame resolving to `null` commits nothing.
    expect(order(harness)).toBe(before);
  });

  it('should move the placeholder for a resolved insertion', async () => {
    const harness = createHarness();

    activate(harness);
    expect(order(harness)).toBe('0_12');

    harness.next(harness.gap(1));
    move(60);
    await nextFrame();

    expect(order(harness)).toBe('01_2');
  });

  it('should bracket the placeholder move with the displacement hooks', async () => {
    const seen: string[] = [];
    const measure = (view: DisplacementView): void => {
      seen.push(`before:${view.placeholder.isConnected}`);
    };
    const play = (): void => {
      seen.push('after');
    };
    const harness = createHarness({
      beforeMove: [measure],
      afterMove: [play],
    });

    activate(harness);
    harness.calls.length = 0;
    harness.next(harness.gap(1));
    move(60);
    await nextFrame();

    expect(seen).toEqual(['before:true', 'after']);
    // Geometry is invalidated after the move, between the two pipelines.
    expect(harness.calls).toEqual(['resolveInsertion', 'invalidateInsertion']);
  });
});

describe('placeholder movement', () => {
  it('should reach a start gap', async () => {
    const harness = createHarness();

    press(harness.items[1]!);
    move(40);
    expect(order(harness)).toBe('01_2');

    harness.next(harness.gap(0, harness.items[1]));
    move(60);
    await nextFrame();

    // Probe 1's `before?.after(…)` was a silent no-op here, because a start gap
    // has no `before` (F-31).
    expect(order(harness)).toBe('_012');
  });

  it('should reach an end gap', async () => {
    const harness = createHarness();

    activate(harness);
    harness.next(harness.gap(2));
    move(60);
    await nextFrame();

    expect(order(harness)).toBe('012_');
  });

  it('should be inert when the placeholder is already in position', async () => {
    const harness = createHarness();

    activate(harness);

    const placeholder = harness.placeholder()!;
    let reinserted = false;
    const observer = new MutationObserver(() => {
      reinserted = true;
    });

    observer.observe(harness.root, { childList: true });
    // The gap it already occupies.
    harness.next(harness.gap(0));
    move(60);
    await nextFrame();
    observer.disconnect();

    // `before()`/`append()` on an already-correct position is a
    // remove-and-reinsert that resets CSS transitions and forces a reflow.
    expect(reinserted).toBe(false);
    expect(harness.placeholder()).toBe(placeholder);
  });
});

describe('release', () => {
  it('should build the proposal from the committed release point', () => {
    const harness = createHarness();

    activate(harness);
    harness.next(harness.gap(2));
    release(123);

    expect(harness.requests).toHaveLength(1);
    expect(harness.requests[0]).toMatchObject({
      item: harness.items[0],
      version: 0,
      from: 0,
      to: 2,
      before: harness.items[2],
      after: null,
    });
  });

  it('should render the final sample, not the last processed move', () => {
    let rendered = '';
    const harness = createHarness({
      onReorder(): ReorderResolution {
        // Captured here because the join restores the inline styles: by the
        // time the drop completes there is no transform left to read.
        rendered = harness.items[0]!.style.transform;
        return ReorderResolution.accept();
      },
    });

    activate(harness);
    move(60);
    harness.next(harness.gap(2));
    release(123);

    // `pointerup` need not carry the last `pointermove`'s coordinates, and the
    // proposal was computed from the committed release point (F-39).
    expect(rendered).toContain('113px');
  });

  it('should skip the round-trip for a proven no-op', () => {
    const harness = createHarness();

    activate(harness);
    release(40);

    // `from === to` is the only legitimate skip. It finishes as a no-op — not a
    // rejection, and not a home recovery (F-29).
    expect(harness.calls).not.toContain('onReorder');
    expect(harness.finishes).toHaveLength(1);
    expect(harness.finishes[0]!.type).toBe('noop');
  });

  it('should not refuse an insertion whose neighbours the snapshot does not support', () => {
    // **The neighbour-coherence test went 2026-08-25 (D-123).** It read the
    // one insertion the package does not build — `InsertionGeometry.resolve`
    // is published at the middle tier — and what made it deletable is that the
    // axis author can now satisfy the term instead: `insertionAt` ships from
    // `sortable/feature.js`, so the construction rule the package proved is
    // one rule (F-91) is the author's too, and a gap that disagrees with it is
    // not a conforming contribution.
    //
    // This is the tripwire a returning check has to argue with. What the
    // consumer then receives is undefined behaviour and is not frozen here.
    const harness = createHarness();

    activate(harness);
    // A gap whose captured neighbours do not describe the released snapshot.
    harness.next({
      version: 0,
      index: 1,
      before: harness.items[2]!,
      after: null,
    });
    release(60);

    expect(harness.errors).toEqual([]);
    expect(harness.finishes).toHaveLength(1);
  });

  it('should still refuse an insertion carrying another version', () => {
    // The check that stays, and the reason it is a different kind: a
    // version-mismatched gap is arithmetic over two orderings, which no
    // author can satisfy — the snapshot it describes is gone. Reporting it as
    // a successful no-op drop would tell the consumer the drag completed
    // normally.
    const harness = createHarness();

    activate(harness);
    harness.next({ ...harness.gap(1), version: 7 });
    release(60);

    expect(harness.errors[0]!.code).toBe('interaction');
    expect(harness.finishes).toEqual([]);
  });

  it('should move the placeholder to the final gap before resolving', () => {
    const harness = createHarness({
      onReorder(): ReorderResolution {
        // The placeholder is already at the proposed gap when the consumer is
        // asked: `release.effect` runs before the kernel executes the command.
        expect(order(harness)).toBe('012_');
        return ReorderResolution.accept();
      },
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    expect(harness.finishes).toHaveLength(1);
  });
});

describe('the terminal boundary (D-66)', () => {
  /**
   * **These rows exist to stop the guarantee being widened by accident.**
   *
   * D-66 makes the terminal total over *started* operations and says nothing
   * about operations that never started — the owner's guarantee is an
   * implication, not a biconditional (Q-15). The boundary is the progress
   * marker, and each case below is chosen so that a marker in the wrong place
   * fails it.
   */
  it('should publish no terminal when activation.prepare throws', () => {
    // `onStart` never ran, so the consumer has no record of this drag
    // beginning. An end for a beginning it never heard is worse than silence.
    const harness = createHarness({
      createPlaceholder: (): never => {
        throw new Error('prepare');
      },
    });

    activate(harness);

    expect(harness.errors).toHaveLength(1);
    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toEqual([]);
  });

  it('should publish a terminal when onStart itself throws', () => {
    // **The row that fails if the marker advances after the call.** The
    // consumer has been told the drag began; it is owed an end. The pair is the
    // assertion — either half alone passes under a wrong marker placement.
    const harness = createHarness({
      onStart(): void {
        throw new Error('onStart');
      },
    });

    activate(harness);

    expect(harness.errors).toHaveLength(1);
    expect(harness.cancels).toHaveLength(1);
    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      stage: AT_PROPOSAL,
    });
  });

  it('should carry AT_PROPOSAL for a failure before the round-trip opens', () => {
    // The marker is at `STARTED`: the drag was announced, and the consumer's
    // resolver has not been reached.
    const harness = createHarness();

    activate(harness);
    Object.defineProperty(harness.items[0]!.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw new Error('cssom');
      },
    });
    move(60);

    expect(harness.cancels[0]).toMatchObject({ stage: AT_PROPOSAL });
  });

  it('should carry AT_PROPOSAL for a release.effect throw', () => {
    // **The regression test for the rejected `proposal !== null` derivation.**
    // The proposal commits in `release.prepare`, one seam earlier, so deriving
    // the stage from it would report `AT_CONSUMER` here — for a drop whose
    // resolver was never invoked, because the staged command is executed only
    // after this effect returns normally.
    const harness = createHarness();

    activate(harness);
    harness.next(harness.gap(2));

    // Poisoned *after* activation, so the failing write is `release.effect`'s
    // own — the one that renders the release point before the round-trip opens.
    Object.defineProperty(harness.items[0]!.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw new Error('release effect');
      },
    });
    release(60);

    expect(harness.calls).not.toContain('onReorder');
    expect(harness.cancels[0]).toMatchObject({ stage: AT_PROPOSAL });
  });

  it('should publish exactly one terminal when the terminal callback throws', () => {
    // `FAILURE_TERMINAL_CALLBACK` is the one stage the failure path excludes,
    // and it has to be: `finalized` already ran, so publishing again would
    // deliver a second end for one operation — and, since it would throw again,
    // do so forever.
    let calls = 0;
    const harness = createHarness({
      onFinish(): void {
        calls += 1;
        throw new Error('onFinish');
      },
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    expect(calls).toBe(1);
    expect(harness.errors).toHaveLength(1);
  });
});

describe('settlement mapping', () => {
  it('should map an accepted resolution to a destination recovery', () => {
    const harness = createHarness();

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    expect(harness.finishes[0]!.type).toBe('accepted');
    expect(harness.cancels).toEqual([]);
  });

  it('should map a rejected resolution to onCancel with its reason', () => {
    const harness = createHarness({
      onReorder: () => ReorderResolution.reject('no'),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    expect(harness.cancels).toHaveLength(1);
    expect(harness.cancels[0]).toMatchObject({
      type: 'rejected',
      reason: 'no',
    });
    expect(harness.finishes).toEqual([]);
  });

  it('should classify a fulfilled non-resolution', () => {
    const harness = createHarness({
      onReorder: () => ({ ok: true }) as unknown as ReorderResolution,
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // Acceptance is never inferred — not from callback silence, not from a
    // truthy return.
    expect(harness.errors[0]!.code).toBe('consumer');
    // **And the drop is still disposed of** (D-66). The resolver malfunctioned
    // after the consumer's round-trip had begun, so the operation publishes
    // `canceled` at `AT_CONSUMER` with the classifying error as its reason —
    // both assertions read `toEqual([])` until D-66.
    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toHaveLength(1);
  });

  it('should classify a rejected round-trip promise', async () => {
    const error = new Error('resolver');
    const harness = createHarness({
      onReorder: () => Promise.reject(error),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);
    await nextFrame();

    // **A resolver malfunction is never reported *as* a consumer verdict**, and
    // that is what this pins — not the absence of a terminal. D-64: the
    // consumer sees the fault class, and the classifying error survives as
    // `cause` rather than being flattened away.
    expect(harness.errors[0]!.code).toBe('consumer');
    expect(harness.errors[0]!.error).toBeInstanceOf(DraggableError);
    expect((harness.errors[0]!.error as DraggableError).cause).toBe(error);

    // The distinction survives D-66 because the two channels answer different
    // questions: the drag ended `canceled` — at `AT_CONSUMER`, since the
    // resolver *was* invoked — while the fault is a `consumer`-class error and
    // not a rejection the consumer chose. Read as `toEqual([])` until D-66.
    expect(harness.cancels).toHaveLength(1);
    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      stage: AT_CONSUMER,
    });
  });

  it('should map a cancel at ACTIVE to the proposal stage', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.cancel('escape');

    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: 'escape',
      stage: AT_PROPOSAL,
      proposal: null,
    });
  });

  it('should map a cancel during the round-trip to the consumer stage', () => {
    const harness = createHarness({
      onReorder: () => new Promise<ReorderResolution>(() => {}),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);
    harness.controller.cancel('gave up');

    const result = harness.cancels[0] as { stage: number; proposal: unknown };

    expect(result.stage).toBe(AT_CONSUMER);
    // The proposal exists by now, and the cancel result carries it.
    expect(result.proposal).not.toBeNull();
  });

  it('should publish both channels for a consequential failure', () => {
    // **The third name this case has had, and the last.** It was *reports
    // through `onError` only* until the D-60 audit, then *publishes no
    // terminal*; D-66 retracts that too. A renderer write on the hot path
    // settles the operation `OUTCOME_FAILED`, and a failed operation holds no
    // domain result — so the fallback applies: the consumer heard this drag
    // start and is owed an end, which is `canceled` at `AT_PROPOSAL` because
    // the failure arrived before any round-trip.
    const harness = createHarness();
    const failure = new Error('cssom');

    activate(harness);
    // A renderer write failure on the hot path.
    Object.defineProperty(harness.items[0]!.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw failure;
      },
    });
    move(60);

    expect(harness.errors[0]!.code).toBe('presentation');
    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toHaveLength(1);

    const result = harness.cancels[0] as { stage: number; reason: unknown };

    // The classifying error travels as the cancellation's reason, **by
    // identity** — which is what makes the fallback honest rather than a
    // placeholder value, and is the half of the acceptance row that a
    // `String(…).toContain` could not tell apart from a re-wrapped copy.
    expect(result.stage).toBe(AT_PROPOSAL);
    expect(result.reason).toBe(failure);
  });
});

/**
 * **The other line of D-66's lookup** (A-1, A-2).
 *
 * 06 §The join states the mapping as a lookup on the frame — *holds a result →
 * publish it; holds none → publish `canceled`* — and every row above exercises
 * the second line only. These exercise the first, which is the line that says
 * what a consumer is told when its data really was reordered and something
 * afterwards went wrong.
 *
 * **Each stage here can only fire after the settlement committed a result**, so
 * they are the whole post-commit failure set rather than a sample of it:
 * `LANDING_CREATE` and `LANDING_INTERRUPTED` both require an armed gate, which
 * arming does after `prepare` returns, and the pin runs at the join. The
 * missing assertion is what let A-1 ship: the nearest kernel row asserts *that*
 * a terminal fired, never *which*, and the sortable rows above all sit before
 * any round-trip.
 */
describe('a failure after the authored commit (D-66)', () => {
  /** Accepts a reorder into gap 2, so the frame holds `accepted` at the join. */
  const commit = (harness: Harness): void => {
    activate(harness);
    harness.next(harness.gap(2));
    release(60);
  };

  it('should keep the accepted result when the landing runner fails', () => {
    // `FAILURE_LANDING_INTERRUPTED` has exactly one producer, and it cannot
    // fire before a runner is armed — so this stage overwrote a committed
    // result *every* time it fired, until the `??`.
    const failure = new Error('interrupted');
    let fail!: (error: unknown) => void;
    const harness = createHarness({
      startLanding: (_context, _done, reject): LandingHandle => {
        fail = reject;
        return { destroy: (): void => {} };
      },
    });

    commit(harness);
    fail(failure);

    expect(harness.cancels).toEqual([]);
    expect(harness.finishes).toHaveLength(1);
    expect(harness.finishes[0]).toMatchObject({ type: 'accepted' });
    // Orthogonal, not exclusive (D-60): the drop is accepted **and** the fault
    // is reported.
    expect(harness.errors).toHaveLength(1);
    expect(harness.errors[0]!.error).toMatchObject({ cause: failure });
  });

  it('should keep the accepted result when the runner cannot be created', () => {
    const harness = createHarness({
      startLanding: (): never => {
        throw new Error('start');
      },
    });

    commit(harness);

    expect(harness.cancels).toEqual([]);
    expect(harness.finishes[0]).toMatchObject({ type: 'accepted' });
    expect(harness.errors).toHaveLength(1);
  });

  it('should keep the accepted result when the pin throws at the join', () => {
    let poison!: () => void;
    const harness = createHarness({
      // Armed from inside `start`, which runs *after* the settlement committed:
      // poisoning any earlier would fail the release render instead, which is a
      // pre-commit stage and a different row.
      startLanding: (_context, done): LandingHandle => {
        poison();
        done();
        return { destroy: (): void => {} };
      },
    });

    poison = (): void => {
      Object.defineProperty(harness.items[0]!.style, 'transform', {
        configurable: true,
        get: (): string => '',
        set(): never {
          throw new Error('pin');
        },
      });
    };

    commit(harness);

    expect(harness.cancels).toEqual([]);
    expect(harness.finishes[0]).toMatchObject({ type: 'accepted' });
    expect(harness.errors).toHaveLength(1);
  });

  it('should keep a rejected result too, not just an accepted one', () => {
    // The tie-break is *existing result wins*, not *accepted wins*. A consumer
    // that rejected the reorder and then hit a landing fault is still owed the
    // verdict it gave, with its own reason.
    const harness = createHarness({
      onReorder: () => ReorderResolution.reject('nope'),
      startLanding: (_context, _done, reject): LandingHandle => {
        reject(new Error('interrupted'));
        return { destroy: (): void => {} };
      },
    });

    commit(harness);

    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toHaveLength(1);
    expect(harness.cancels[0]).toMatchObject({
      type: 'rejected',
      reason: 'nope',
    });
  });
});

describe('the landing target', () => {
  it('should re-anchor to the item for a destination recovery', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // With no readiness promise the consumer asserted its presentation is
    // final **synchronously**, so `authoredReady` is true from sealing and the
    // arm-time measurement re-anchors immediately.
    //
    // This consumer accepted without applying the reorder, so the item is still
    // at its old slot — and the placeholder follows it there. That is the
    // contract, not a defect: the anchor is always the item (I-25), and a
    // consumer that accepts synchronously has asserted the DOM it is showing is
    // the authored final one.
    expect(order(harness)).toBe('_012');

    runner.done();
    expect(harness.finishes).toHaveLength(1);
  });

  it('should repair the semantic gap when the item moved', () => {
    const runner = createRunner();
    let applied: (() => void) | null = null;
    const harness = createHarness({
      startLanding: runner.start,
      onReorder(): ReorderResolution {
        // The consumer applies the reorder itself and lands the item past the
        // placeholder, leaving the placeholder on the wrong side of it (F-15).
        applied!();
        return ReorderResolution.accept();
      },
    });

    applied = (): void => {
      harness.root.append(harness.items[0]!);
    };

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // The item is the anchor, and the repair puts the placeholder back in front
    // of it — the gap the consumer's own commit describes.
    expect(harness.items[0]!.previousElementSibling).toBe(
      harness.placeholder(),
    );
  });

  it('should not reinsert the placeholder when it is already anchored', async () => {
    const runner = createRunner();
    let applied: (() => void) | null = null;
    const harness = createHarness({
      startLanding: runner.start,
      onReorder(): ReorderResolution {
        applied!();
        return ReorderResolution.accept();
      },
    });

    applied = (): void => {
      harness.root.append(harness.items[0]!);
    };

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // The arm-time measurement has repaired the gap. The join measures again,
    // and the placeholder is already adjacent to the item.
    //
    // Captured before observing: the join removes the placeholder on its way
    // out, so looking it up from inside the callback would find nothing.
    const placeholder = harness.placeholder()!;
    let removals = 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if ([...record.removedNodes].includes(placeholder)) {
          removals += 1;
        }
      }
    });

    observer.observe(harness.root, { childList: true });
    runner.done();
    await nextFrame();
    observer.disconnect();

    // Exactly one removal: the join's own, releasing presentation. A second
    // would mean the repair ran — `before()` on an already-correct position is
    // a remove-and-reinsert that resets CSS transitions and forces a reflow, on
    // every settlement.
    expect(removals).toBe(1);
    expect(harness.finishes).toHaveLength(1);
  });

  it('should follow the grabbed item when a replacement moves it', () => {
    const runner = createRunner();
    const harness = createHarness({
      itemCount: 4,
      startLanding: runner.start,
      onReorder: () => ReorderResolution.reject('no'),
    });

    activate(harness);

    // The consumer moves the grabbed item to the end of the collection. Its
    // home gap moves with it — item 0 now belongs after item 3, not at the
    // head — and the start gap the drag is holding still survives, so the
    // operation continues.
    harness.replace([
      harness.items[1]!,
      harness.items[2]!,
      harness.items[3]!,
      harness.items[0]!,
    ]);
    expect(harness.cancels).toEqual([]);

    // The DOM is untouched — a replacement changes the logical collection, not
    // the elements — so the placeholder still sits at the head, where the home
    // *start* gap put it.
    expect(order(harness)).toBe('0_123');

    release(60);

    // Home recovery derives the gap from the **latest committed** collection:
    // item 0 is now last, so its home gap is the end gap. Reusing the gap the
    // drag started against would have left the placeholder at the head.
    expect(order(harness)).toBe('0123_');

    runner.done();
    expect(harness.cancels[0]!.type).toBe('rejected');
  });

  it('should recover to the home gap of the frozen transaction', () => {
    const runner = createRunner();
    const harness = createHarness({
      itemCount: 4,
      startLanding: runner.start,
      onReorder(): ReorderResolution {
        // Arrives while the operation is resolving. It publishes — the update
        // is never lost — but the transaction's own snapshot is decided.
        harness.replace([
          harness.items[1]!,
          harness.items[2]!,
          harness.items[3]!,
          harness.items[0]!,
        ]);
        return ReorderResolution.reject('no');
      },
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);
    expect(harness.cancels).toEqual([]);

    // Home is the home *of the transaction being recovered*, so it comes from
    // the frozen snapshot: the drag began with item 0 at the head, the consumer
    // rejected, and that is where the item goes back to. Deriving it from the
    // newer published collection would move the placeholder to a gap the
    // transaction never agreed to.
    expect(order(harness)).toBe('0_123');

    runner.done();
    expect(harness.cancels[0]!.type).toBe('rejected');
  });

  it('should not fabricate a gap for a removed item', async () => {
    const runner = createRunner();
    const harness = createHarness({ itemCount: 4, startLanding: runner.start });

    activate(harness);
    // Drag the placeholder away from the head first, so a fabricated home gap
    // would be observable rather than coincidentally inert.
    harness.next(harness.gap(3));
    move(60);
    await nextFrame();
    expect(order(harness)).toBe('0123_');

    // The item vanishes mid-drag, so the cancellation's home recovery has no
    // gap to derive.
    harness.replace([harness.items[1]!, harness.items[2]!, harness.items[3]!]);

    // `indexOf` is -1 there, and -1 is not a gap: without the guard the
    // arithmetic yields a plausible *start* gap — `before` undefined, `after`
    // the first item — and silently drags the placeholder across the list.
    expect(order(harness)).toBe('0123_');
  });

  it('should not derive a home gap for an item the replacement removed', () => {
    const harness = createHarness({ itemCount: 4 });

    activate(harness);
    expect(order(harness)).toBe('0_123');

    // The grabbed item itself vanishes.
    harness.replace([harness.items[1]!, harness.items[2]!, harness.items[3]!]);

    // It cancels for the *item*, not for the gap, and the home measurement has
    // no gap to derive: `indexOf` is -1, and the placeholder is measured where
    // it stands rather than moved to a fabricated index.
    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: CANCEL_ITEM_REMOVED,
    });
    expect(harness.errors).toEqual([]);
    expect(reported).toEqual([]);

    // And it retires cleanly.
    expect(harness.placeholder()).toBeNull();
    expect(harness.items[0]!.style.transform).toBe('');
  });

  it('should stay usable after an item-removed cancellation', () => {
    const harness = createHarness({ itemCount: 4 });

    activate(harness);
    harness.replace([harness.items[1]!, harness.items[2]!, harness.items[3]!]);

    // The removed item is no longer admissible; the survivors still are.
    press(harness.items[0]!);
    move(40);
    expect(harness.started).toHaveLength(1);

    press(harness.items[1]!);
    move(40);
    expect(harness.started).toHaveLength(2);
  });

  it('should return the placeholder home for a rejected drop', () => {
    const runner = createRunner();
    const harness = createHarness({
      startLanding: runner.start,
      onReorder: () => ReorderResolution.reject('no'),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // Home recovery deliberately returns the placeholder to the grab slot
    // before measuring — recomputed from the committed snapshot, not stored.
    expect(order(harness)).toBe('0_12');

    runner.done();
    expect(harness.cancels).toHaveLength(1);
  });

  it('should hold no landing gate for an immediate recovery', () => {
    const runner = createRunner();
    const harness = createHarness({ startLanding: runner.start });

    activate(harness);
    release(40);

    // A no-op recovers immediately — the placeholder is already where the item
    // belongs — so no landing hold is requested even though the feature is
    // installed, and the drop finalizes in the same drain (I-9).
    expect(harness.finishes[0]!.type).toBe('noop');
    expect(order(harness)).toBe('012');
  });
});

describe('the collection', () => {
  it('should publish an idle replacement without binding it to a frame', () => {
    const harness = createHarness();
    const replacement = [harness.items[2]!, harness.items[1]!];

    harness.replace(replacement);
    // Pressing the item that is now first proves the new snapshot is live.
    press(harness.items[2]!);
    move(40);

    expect(harness.calls).toContain('onStart');
  });

  it('should copy the caller array at call time', () => {
    const harness = createHarness();
    const mutable = [harness.items[1]!, harness.items[0]!];

    harness.replace(mutable);
    mutable.length = 0;
    press(harness.items[1]!);
    move(40);

    // A caller that keeps mutating its own array cannot change a snapshot the
    // behavior has already published.
    expect(harness.calls).toContain('onStart');
  });

  it('should rebase a surviving gap during an active drag', async () => {
    const harness = createHarness({ itemCount: 4 });

    activate(harness);
    harness.next(harness.gap(1));
    move(60);
    await nextFrame();
    expect(order(harness)).toBe('01_23');

    // The gap between items 1 and 2 survives: both remain adjacent.
    harness.replace([
      harness.items[3]!,
      harness.items[0]!,
      harness.items[1]!,
      harness.items[2]!,
    ]);

    expect(harness.cancels).toEqual([]);
    expect(harness.errors).toEqual([]);
  });

  it('should publish and then cancel when the gap cannot survive', () => {
    const harness = createHarness({ itemCount: 4 });

    activate(harness);
    // Break the gap — the incumbent neighbours are no longer adjacent — and
    // drop an item in the same replacement.
    harness.replace([harness.items[0]!, harness.items[2]!, harness.items[1]!]);

    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: CANCEL_COLLECTION_INVALIDATED,
    });

    // The consumer's update is never lost: the replacement published *before*
    // the cancel, so the dropped item is no longer admissible (D-25, F-28).
    press(harness.items[3]!);
    move(40);
    expect(harness.started).toHaveLength(1);
  });

  it('should rebase an internal gap that stays adjacent', () => {
    const harness = createHarness({ itemCount: 4 });

    // Dragging item 2 makes the home gap internal: item 1 before, item 3 after.
    press(harness.items[2]!);
    move(40);
    expect(harness.started[0]).toBe(harness.items[2]);

    // Item 0 moves to the end. Items 1 and 3 stay adjacent, so the gap between
    // them survives.
    harness.replace([
      harness.items[1]!,
      harness.items[2]!,
      harness.items[3]!,
      harness.items[0]!,
    ]);

    expect(harness.cancels).toEqual([]);

    // And the rebased gap is the one the release resolves against.
    release(40);
    expect(harness.finishes[0]!.type).toBe('noop');
  });

  it('should cancel when an internal gap loses its adjacency', () => {
    const harness = createHarness({ itemCount: 4 });

    press(harness.items[2]!);
    move(40);

    // Item 0 is inserted *between* the incumbent neighbours. The gap the
    // consumer was shown no longer exists, and intent is never recomputed from
    // the latest pointer position (I-14).
    harness.replace([
      harness.items[1]!,
      harness.items[0]!,
      harness.items[3]!,
      harness.items[2]!,
    ]);

    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: CANCEL_COLLECTION_INVALIDATED,
    });
  });

  it('should refuse to build a proposal across versions', () => {
    const harness = createHarness({ itemCount: 4 });

    activate(harness);
    // A replacement the home gap survives, so the drag continues — at version 1.
    harness.replace([
      harness.items[0]!,
      harness.items[1]!,
      harness.items[3]!,
      harness.items[2]!,
    ]);

    // An insertion still carrying version 0. Mixed-version arithmetic is
    // invalid: the indices would describe a different ordering than the one the
    // request claims.
    harness.next({
      version: 0,
      index: 2,
      before: harness.items[3]!,
      after: harness.items[2]!,
    });
    release(60);

    expect(harness.errors[0]!.code).toBe('interaction');
    expect(harness.finishes).toEqual([]);
  });

  it('should cancel with item-removed when the dragged item vanishes', () => {
    const harness = createHarness();

    activate(harness);
    harness.replace([harness.items[1]!, harness.items[2]!]);

    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: CANCEL_ITEM_REMOVED,
    });
  });

  it('should apply an update from inside onStart at ACTIVATING', async () => {
    const harness = createHarness({
      itemCount: 4,
      onStart(each): void {
        each.replace([
          each.items[0]!,
          each.items[1]!,
          each.items[3]!,
          each.items[2]!,
        ]);
      },
    });

    activate(harness);
    move(60);
    await nextFrame();

    // FIFO puts the update ahead of START_COMMITTED, so it is applied while the
    // phase is still ACTIVATING — not deferred (F-32). The home gap after item
    // 0 survives, so the drag continues against the new snapshot.
    expect(harness.snapshot().items[2]).toBe(harness.items[3]);
    expect(harness.snapshot().version).toBe(1);
    expect(harness.cancels).toEqual([]);
  });

  it('should not rewrite the frozen snapshot after release', () => {
    const harness = createHarness({
      onReorder(): ReorderResolution {
        // Arrives while the operation is resolving: it publishes, but the
        // transaction's own snapshot is decided.
        harness.replace([harness.items[2]!, harness.items[1]!]);
        return ReorderResolution.accept();
      },
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // Narrowed on the discriminant rather than on which callback delivered it
    // — which is D-62's point, and what the four-arm union makes the consumer's
    // job (F-41).
    const result = harness.finishes[0]!;

    expect(result.type).toBe('accepted');
    expect(result.proposal!.snapshot.items).toHaveLength(3);
    expect(result.proposal!.request.version).toBe(0);
  });
});

describe('retirement', () => {
  it('should run the retire hooks, each wrapped', () => {
    const seen: string[] = [];
    const harness = createHarness({
      retireHooks: [
        (): void => {
          seen.push('outer');
          throw new Error('hook');
        },
        (): void => {
          seen.push('inner');
        },
      ],
    });

    activate(harness);
    harness.controller.cancel('reason');

    // One throwing hook does not stop the rest from restoring their DOM.
    expect(seen).toEqual(['outer', 'inner']);
    expect(reported).toHaveLength(1);
  });

  it('should leave no placeholder and no item references behind', () => {
    const harness = createHarness();

    activate(harness);
    expect(harness.placeholder()).not.toBeNull();

    harness.controller.cancel('reason');

    // An idle controller retains no DOM from the completed drag (I-20).
    expect(harness.placeholder()).toBeNull();
    expect(harness.items[0]!.style.transform).toBe('');
  });

  it('should admit a second drag after the first completed', () => {
    const harness = createHarness();

    activate(harness);
    release(40);
    expect(harness.finishes).toHaveLength(1);

    activate(harness);
    release(40);

    expect(harness.finishes).toHaveLength(2);
  });
});

describe('collection identity', () => {
  it('should apply two signals queued in one drain exactly once', () => {
    // **The pull source collapses signals within a drain** (D-44). Both
    // replacements preserve the incumbent gap, so neither cancels; what is
    // under test is that the second action finds the identity unchanged and
    // consumes no version.
    //
    // Read together with the test below, this pins the whole of the rule: a
    // signal is a request to re-read, so two signals against one final
    // collection produce one application, while two collections applied in
    // separate drains produce two.
    const harness = createHarness({
      onStart(h): void {
        h.replace([h.items[0]!, h.items[1]!, h.items[2]!]);
        h.replace([h.items[0]!, h.items[1]!, h.items[2]!]);
      },
    });

    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.calls).not.toContain('onCancel');
      expect(harness.snapshot().version).toBe(1);
    });
  });

  it('should invalidate geometry only when the identity did not move', () => {
    // **The branch that makes the pull source cheaper than the push method it
    // replaces** (D-44), and the one a resize, a zoom or a scroll produces.
    // `items()` returns the array it returned last time, so there is no
    // structural change: no snapshot, no reconcile, no O(n) copy, no version.
    const harness = createHarness();

    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame()
      .then(() => {
        const before = harness.calls.filter(
          (call) => call === 'invalidateInsertion',
        ).length;

        // The bare signal — no `replace()`, so `current` is untouched.
        harness.controller.invalidate();

        expect(
          harness.calls.filter((call) => call === 'invalidateInsertion'),
        ).toHaveLength(before + 1);

        // Resolve again, so `snapshot()` reads what the runtime actually
        // holds. Asserting the version straight after the signal would pass
        // whether or not the branch exists — the harness only refreshes its
        // copy when the axis rule resolves.
        harness.next(null);
        move(90);
        return nextFrame();
      })
      .then(() => {
        expect(harness.snapshot().version).toBe(0);
        expect(harness.calls).not.toContain('onCancel');
      });
  });

  it('should keep versions increasing across separate drains', () => {
    const harness = createHarness();

    harness.replace([harness.items[0]!, harness.items[1]!]);
    harness.replace([harness.items[0]!, harness.items[2]!]);
    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.snapshot().version).toBe(2);
    });
  });

  it('should publish a duplicated collection the pull source returned', () => {
    // **The refusal went 2026-08-25 (D-121)**, when `items`'s own TSDoc took
    // over the term: distinct element identity is the condition under which
    // the published `{ from, to }` pair means anything, so a collection
    // naming one element twice is outside the contract and not the library's
    // to detect. This row is the tripwire that a returning check has to argue
    // with — **no throw, no report** — and it deliberately stops there. What
    // such a collection then does to an operation is undefined behaviour, and
    // D-120 §1 is where the traces of it are kept.
    const harness = createHarness();

    expect(() =>
      harness.replace([harness.items[0]!, harness.items[0]!]),
    ).not.toThrow();

    expect(reported).toEqual([]);
  });

  it('should not consume a version for a pull that produced no collection', () => {
    // The counter must stay a dense identity for the collections that exist,
    // so a version is taken only after a snapshot is minted — which is what
    // orders the copy before the increment in `spec.ts`.
    //
    // **Re-pointed at a throwing pull** (D-121). The refused input used to be
    // a duplicated element; with that refusal gone, the surviving way for a
    // pull to produce nothing is the consumer's own `items()` raising, which
    // `action.prepare` classifies. Refused while **idle**, deliberately: a
    // classified failure of a live operation ends it, which is a different
    // consequence of D-44 and not what this row is about.
    let poison = true;
    const harness = createHarness({
      pull(items): readonly HTMLElement[] {
        if (poison) {
          throw new TypeError('consumer pull');
        }

        return items;
      },
    });

    harness.replace([harness.items[1]!, harness.items[0]!]);

    // Idle, so the classified failure is demoted rather than settling an
    // operation — it reaches `onError` as a warning and no terminal is owed.
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(DraggableWarning);
    expect(String(reported[0]?.cause)).toMatch(/consumer pull/u);

    poison = false;
    harness.replace([harness.items[0]!, harness.items[1]!, harness.items[2]!]);

    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.snapshot().version).toBe(1);
    });
  });
});

describe('invalidate() after destroy', () => {
  let destroyed = false;

  beforeEach(() => {
    destroyed = false;
  });

  it('should stay inert for a valid replacement', () => {
    // The parity ledger promises the collection channel is a no-op after
    // `destroy()`; D-44 changed the member, not the promise.
    // The kernel's own latch drops the dispatch, but the controller reached it
    // only after copying the array and advancing the private version, so the
    // "no-op" was true of the kernel and not of the method (D3).
    const harness = createHarness();

    void harness.controller.destroy();
    harness.replace([harness.items[1]!, harness.items[0]!]);
    press(harness.items[1]!);
    move(40);

    // Ingress is closed, so nothing can observe a snapshot either way — the
    // assertion is that the whole controller stayed silent.
    expect(harness.calls).toEqual([]);
    expect(reported).toEqual([]);
  });

  it('should not pull the collection at all for a post-destroy replacement', () => {
    // The observable half, and the one a "no action reached the kernel"
    // assertion misses entirely: work ran *before* the closed latch, so an
    // inert controller still reached the consumer's own code.
    //
    // **Re-pointed at the pull** (D-121). It used to be spelled with a
    // duplicated element, because validation was the work that ran early and
    // its throw was what escaped; with the refusal gone, what must still not
    // happen is the `items()` call itself — the one piece of consumer code on
    // this path, and the only thing left that can throw.
    let pulls = 0;
    const harness = createHarness({
      pull(items): readonly HTMLElement[] {
        pulls += 1;
        return items;
      },
    });

    const before = pulls;

    void harness.controller.destroy();

    expect(() =>
      harness.replace([harness.items[1]!, harness.items[0]!]),
    ).not.toThrow();
    expect(pulls).toBe(before);
  });

  it('should not classify a post-destroy replacement as an activation failure', () => {
    // The realistic arrival, and where a throw is not merely returned to the
    // caller: a consumer tears the list down from a callback and its own store
    // notification lands in the same drain. `onStart` runs inside
    // `activation.effect`, so a `TypeError` raised there would be classified
    // `FAILURE_ACTIVATION` against an operation the consumer already
    // destroyed.
    const harness = createHarness({
      pull(items): readonly HTMLElement[] {
        if (destroyed) {
          throw new TypeError('consumer pull');
        }

        return items;
      },
      onStart(h): void {
        void h.controller.destroy();
        destroyed = true;
        h.replace([h.items[1]!, h.items[0]!]);
      },
    });

    activate(harness);

    expect(harness.errors).toEqual([]);
    expect(reported).toEqual([]);
  });
});

describe('invalidation failure classification', () => {
  it('should classify a scroll-time invalidation failure', () => {
    // A native listener is not a seam, so this error used to reach neither
    // `onError` nor the platform channel.
    let armed = false;
    const harness = createHarness({
      invalidateInsertion: (): void => {
        if (armed) {
          throw new Error('invalidation failed');
        }
      },
    });

    activate(harness);
    armed = true;
    window.dispatchEvent(new Event('scroll'));

    expect(harness.errors.map((error) => error.code)).toEqual(['platform']);
  });

  it('should classify a failing settled-geometry measurement as an invalidation failure', async () => {
    // The eager half of the same concern, so it shares the stage — and
    // therefore the recovery — with the lazy half. The surrounding seam would
    // otherwise report it as a placeholder-move failure.
    const after: string[] = [];
    const harness = createHarness({
      measureInsertion: (): void => {
        throw new Error('measurement failed');
      },
      afterMove: [
        (): void => {
          after.push('afterMove');
        },
      ],
    });

    activate(harness);
    harness.next(harness.gap(1));
    move(90);
    await nextFrame();

    expect(harness.errors.map((error) => error.code)).toEqual(['platform']);
    // Classified means stopped: the displacement hooks never run against an
    // index that is neither the old geometry nor the new.
    expect(after).toEqual([]);
  });

  it('should classify an activation-time invalidation failure as its own stage', () => {
    // Not `FAILURE_ACTIVATION`: the surrounding seam would otherwise name the
    // wrong thing in `SortableErrorContext.stage`.
    const harness = createHarness({
      invalidateInsertion: (): void => {
        throw new Error('invalidation failed');
      },
    });

    activate(harness);

    expect(harness.errors.map((error) => error.code)).toEqual(['platform']);
  });

  it('should not start an operation whose activation invalidation failed', () => {
    const harness = createHarness({
      invalidateInsertion: (): void => {
        throw new Error('invalidation failed');
      },
    });

    activate(harness);

    expect(harness.calls).not.toContain('onStart');
  });

  it('should classify a scheduling failure as SCHEDULED_FRAME', () => {
    // `moved` is one callback with two stages; the kernel wrapper classifies
    // the whole call as a renderer write, so scheduling narrows from inside.
    const harness = createHarness();
    const native = window.requestAnimationFrame;

    // Activation itself schedules nothing; the first *active* sample does.
    activate(harness);
    window.requestAnimationFrame = (): number => {
      throw new Error('no frames');
    };

    try {
      move(80);
    } finally {
      window.requestAnimationFrame = native;
    }

    expect(harness.errors.map((error) => error.code)).toEqual(['platform']);
  });
});

describe('placeholder factory results', () => {
  // **The adoption refusal went 2026-08-25 (D-124).** `config.d.ts` publishes
  // the precondition on the slot — a **detached** element that is neither the
  // item nor its visual — so these are outside the contract and the library no
  // longer refuses them. The rows below are the tripwire a returning guard
  // has to argue with, and what each asserts is that the **library's own**
  // seam still holds: an insertion it cannot make is classified, not made.
  //
  // ~~And this is the exact wreckage each one leaves.~~ **Trimmed 2026-08-25**
  // (the D-124 landing review, §1.1 (C)): the mechanized attribute and the
  // teardown deleting the consumer's own item were the downstream shape of
  // undefined behaviour frozen as a regression contract — recorded in D-124's
  // row and in `COVERAGE.md`, which is where evidence about input the contract
  // excludes belongs.

  it('should adopt the dragged item and lose the insertion one seam later', () => {
    // The natural failure the deletion relies on, executed rather than
    // assumed: the item is adopted and mechanized, and the very next act —
    // inserting a placeholder that *is* the item — leaves the insertion
    // unmade, which `activation.effect` already refuses on its own terms.
    const harness = createHarness({
      createPlaceholder: ({ item }) => item,
    });

    activate(harness);

    expect(harness.errors.map((entry) => entry.code)).toEqual(['interaction']);
    expect(String(harness.errors[0]!.error)).toMatch(
      /sortable\/insertion-placeholder-lost/u,
    );
  });

  it('should adopt the lifted visual and lose the insertion the same way', () => {
    const harness = createHarness({
      createPlaceholder: ({ visual }) => visual,
    });

    activate(harness);

    expect(harness.errors.map((entry) => entry.code)).toEqual(['interaction']);
  });

  it('should move a node that is already in the document', () => {
    const outside = document.createElement('div');

    document.body.append(outside);
    cleanup.push(() => outside.remove());

    const harness = createHarness({
      createPlaceholder: () => outside,
    });

    activate(harness);

    expect(outside.parentElement).not.toBe(document.body);
  });

  it('should fail at the first mechanics write for a result that is not an element', () => {
    const harness = createHarness({
      createPlaceholder: () => ({}) as unknown as HTMLElement,
    });

    activate(harness);

    expect(harness.errors.map((error) => error.code)).toEqual(['interaction']);
  });

  it('should clear a stale slot when the item has none', () => {
    const harness = createHarness({
      createPlaceholder: (): HTMLElement => {
        const element = document.createElement('div');

        element.setAttribute('slot', 'stale');
        return element;
      },
    });

    activate(harness);

    expect(harness.placeholder()!.hasAttribute('slot')).toBe(false);
  });

  it('should mirror the slot the item does have', () => {
    const harness = createHarness({
      createPlaceholder: (): HTMLElement => {
        const element = document.createElement('div');

        element.setAttribute('slot', 'stale');
        return element;
      },
    });

    harness.items[0]!.setAttribute('slot', 'list');
    activate(harness);

    expect(harness.placeholder()!.getAttribute('slot')).toBe('list');
  });
});

describe('inert placeholder movement', () => {
  it('should not run the move pipeline for an already-correct gap', async () => {
    const seen: string[] = [];
    const harness = createHarness({
      beforeMove: [(): void => void seen.push('before')],
      afterMove: [(): void => void seen.push('after')],
    });

    activate(harness);
    await nextFrame();
    expect(order(harness)).toBe('0_12');

    const snapshot = harness.snapshot();
    const destination = snapshot.items.filter(
      (item) => item !== harness.items[0]!,
    );

    seen.length = 0;
    harness.calls.length = 0;
    // Exactly the gap the placeholder already occupies.
    harness.next({
      version: snapshot.version,
      index: 0,
      before: null,
      after: destination[0]!,
    });
    move(90);
    await nextFrame();

    expect(seen).toEqual([]);
  });

  it('should not invalidate geometry for an already-correct gap', async () => {
    const harness = createHarness();

    activate(harness);
    await nextFrame();

    const snapshot = harness.snapshot();
    const destination = snapshot.items.filter(
      (item) => item !== harness.items[0]!,
    );

    harness.calls.length = 0;
    harness.next({
      version: snapshot.version,
      index: 0,
      before: null,
      after: destination[0]!,
    });
    move(90);
    await nextFrame();

    expect(harness.calls).not.toContain('invalidateInsertion');
  });

  it('should still run the move pipeline for a real move', async () => {
    const seen: string[] = [];
    const harness = createHarness({
      beforeMove: [(): void => void seen.push('before')],
      afterMove: [(): void => void seen.push('after')],
    });

    activate(harness);
    await nextFrame();

    seen.length = 0;
    harness.next(harness.gap(2));
    move(90);
    await nextFrame();

    expect(order(harness)).toBe('012_');
    expect(seen).toEqual(['before', 'after']);
  });
});

describe('the spatial action legality guard', () => {
  /**
   * Driven directly, because no producer can reach the illegal phases: the
   * frame task is cancelled when motion closes at release, and nothing else
   * dispatches this tag. The guard exists so that a future producer — a
   * replayed action, a flush from a hook — cannot commit a placeholder move
   * into a transaction that is already decided.
   */
  const prepareSpatialAt = (phase: number): unknown => {
    const root = document.createElement('div');
    const item = document.createElement('div');

    root.append(item);
    document.body.append(root);
    cleanup.push(() => root.remove());

    let resolved = 0;
    const rt = createSortableRuntime(
      {
        realm: createRealm(root),
        root,
        dispatch: (): void => {},
        fail: (): void => {},
        cancel: (): void => {},
        closed: false,

        destroy: (): Promise<void> => Promise.resolve(),
      },
      [item],
      [item],
      {
        ...EMPTY_SLOTS,
        resolveInsertion: () => {
          resolved += 1;
          return { version: 0, index: 0, before: null, after: null };
        },
      },
    );

    // A live presentation and a matching attempt, so the *only* thing that can
    // discard the action is the phase.
    rt.view = {
      realm: rt.host.realm,
      placeholder: item,
      item,
      getBox: null,
      live: () => !rt.host.closed,
      snapshot: rt.snapshot,
      insertion: null,
    };
    rt.pendingSpatial = 1;

    const spec = createSortableSpec(rt);
    const draft = {
      ...createSortableFramePart(),
      phase,
      snapshot: rt.snapshot,
      item,
    } as unknown as Parameters<typeof spec.action.prepare>[2];

    return { staged: spec.action.prepare(TAG_SPATIAL, 1, draft), resolved };
  };

  it('should stage a spatial action at ACTIVE', () => {
    expect(prepareSpatialAt(ACTIVE)).toEqual({ staged: STAGED, resolved: 1 });
  });

  it('should discard a spatial action at RELEASING', () => {
    expect(prepareSpatialAt(RELEASING)).toEqual({ staged: null, resolved: 0 });
  });

  it('should discard a spatial action at SETTLING', () => {
    expect(prepareSpatialAt(SETTLING)).toEqual({ staged: null, resolved: 0 });
  });

  it('should discard a spatial action at FINALIZING', () => {
    expect(prepareSpatialAt(FINALIZING)).toEqual({ staged: null, resolved: 0 });
  });

  it('should discard a spatial action at ACTIVATING', () => {
    expect(prepareSpatialAt(ACTIVATING)).toEqual({ staged: null, resolved: 0 });
  });
});

describe('a pointerless release with no destination', () => {
  it('should reject rather than fall back to home', () => {
    // Driven directly, because **no producer can reach it**: `command.admit`
    // always writes a gap before returning non-null, and a replacement that
    // invalidates one cancels the operation instead of nulling it. The guard is
    // still the contract's (02 §The command destination) and the reason it is
    // not a home fallback is a correctness one, so it is asserted here rather
    // than left to read as tested.
    //
    // The pointer path's home fallback exists because a spatial resolve can
    // legitimately find nothing. A command that reached `RELEASING` with no
    // destination has lost state the kernel guaranteed to carry, and reporting
    // that as a home-gap reorder would tell the consumer a drop completed
    // normally.
    const root = document.createElement('div');
    const item = document.createElement('div');

    root.append(item);
    document.body.append(root);
    cleanup.push(() => {
      root.remove();
    });

    const rt = createSortableRuntime(
      {
        realm: createRealm(root),
        root,
        dispatch: (): void => {},
        fail: (): void => {},
        cancel: (): void => {},
        closed: false,

        destroy: (): Promise<void> => Promise.resolve(),
      },
      [item],
      [item],
      { ...EMPTY_SLOTS },
    );

    rt.view = {
      realm: rt.host.realm,
      placeholder: item,
      item,
      getBox: null,
      live: () => !rt.host.closed,
      snapshot: rt.snapshot,
      insertion: null,
    };

    const spec = createSortableSpec(rt);
    const draft = {
      ...createSortableFramePart(),
      phase: RELEASING,
      pointerId: -1,
      snapshot: rt.snapshot,
      item,
      insertion: null,
    } as unknown as Parameters<typeof spec.release.prepare>[0];

    const result = spec.release.prepare(draft);

    expect(result).toMatchObject({ stage: FAILURE_RELEASE });
    // And specifically **not** a command: a rejection is classified, so the
    // staged round-trip is never executed.
    expect(result).not.toHaveProperty('invoke');
  });
});

describe('the hoisted move leaf', () => {
  it('should read the live frame and lift on a second operation', () => {
    // The active-movement leaf is one controller-stable closure now. It stays
    // correct only because it reads the swappable `current` and `lift` slots at
    // call time rather than capturing them.
    const harness = createHarness();

    // The first operation must actually *move* while active, so the leaf has
    // already run once with the first operation's lift before the second
    // operation swaps it.
    activate(harness);
    move(90);
    release(90);

    press(harness.items[1]!);
    move(40);
    move(120);

    expect(harness.started).toEqual([harness.items[0]!, harness.items[1]!]);
    expect(harness.items[1]!.style.transform).not.toBe('');
    expect(harness.items[0]!.style.transform).toBe('');
  });
});

describe('the placeholder container guard', () => {
  /** A container outside the sortable root, torn down with the test. */
  const foreignContainer = (): HTMLElement => {
    const foreign = document.createElement('div');

    document.body.append(foreign);
    cleanup.push(() => {
      foreign.remove();
    });

    return foreign;
  };

  it('should refuse a spatial move whose anchor left the container', () => {
    // The snapshot still contains the item, so the insertion is coherent — it
    // is the *DOM* that moved. Without the guard `before()` succeeds and takes
    // the placeholder out of the list with it.
    const harness = createHarness();

    activate(harness);

    const foreign = foreignContainer();

    foreign.append(harness.items[2]!);
    harness.next(harness.gap(1));
    move(90);

    return nextFrame().then(() => {
      expect(harness.errors).toHaveLength(1);
      expect(harness.errors[0]!.code).toBe('presentation');
      // The checkpoint has already retired the operation and removed the
      // placeholder; what matters is that it never reached the other container.
      expect(foreign.children).toHaveLength(1);
    });
  });

  it('should refuse a release whose resolved anchor left the container', () => {
    const harness = createHarness();

    activate(harness);

    const foreign = foreignContainer();

    foreign.append(harness.items[2]!);
    harness.next(harness.gap(1));
    release(90);

    // The write is `release.effect`, so the command staged by `prepare` is
    // never executed: the consumer is not asked to apply a reorder the library
    // could not render.
    expect(harness.calls).not.toContain('onReorder');
    expect(harness.errors[0]!.code).toBe('interaction');
    expect(foreign.children).toHaveLength(1);
  });

  it('should refuse a home recovery whose anchor left the container and still cancel', () => {
    const harness = createHarness();

    activate(harness);

    const foreign = foreignContainer();

    foreign.append(harness.items[1]!);
    harness.controller.cancel('gone');

    // **The orthogonality case, and the assertion that has now read three
    // ways** (D-49, D-60, D-130). Home recovery runs inside `anchorTarget`, so
    // it used to classify at the landing-target stage and suppress the terminal
    // for an outcome the checkpoint was about to replace. D-49 moved it to the
    // quality track — reported *and* terminated, because those are two
    // different questions — and D-130 finishes the thought: the fault changed
    // no terminal result, no phase sequence and no settlement, so it is a
    // warning and carries no code at all.
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(DraggableWarning);
    expect(reported[0]?.message).toBe('drag: landing/target-unavailable');
    // Still both: the advisory report **and** the terminal.
    expect(harness.calls).toContain('onCancel');
  });

  it('should skip a destination recovery whose item left the container', () => {
    // The destination branch never moves the placeholder across containers to
    // begin with — it re-anchors only when the item is still a sibling — so the
    // drop completes normally and the placeholder simply stays put.
    const harness = createHarness();

    activate(harness);

    const foreign = foreignContainer();

    harness.next(harness.gap(1));
    release(90);
    foreign.append(harness.items[0]!);

    expect(harness.errors).toEqual([]);
    expect(harness.calls).toContain('onFinish');
    expect(foreign.children).toHaveLength(1);
  });
});

describe('seam staging across whole operations', () => {
  /**
   * The dev-only report the driver emits when a seam's staged value is still
   * sitting in the slot as the next seam opens. Nothing in a healthy drag may
   * produce one: a staged command that outlives its transaction is exactly how
   * a decided operation gets a second turn at executing.
   */
  const leaks = (): unknown[] =>
    reported.filter(
      (error) =>
        error instanceof Error && error.message.includes('staged-unconsumed'),
    );

  it('should leave nothing staged across two consecutive drags', async () => {
    const harness = createHarness();

    activate(harness);
    harness.next(harness.gap(1));
    move(90);
    await nextFrame();
    release(90);

    // The second operation is what makes the first one's leftovers visible:
    // its activation seam is the next `runCore` after the first settlement.
    press(harness.items[1]!);
    move(40);
    release(40);

    expect(leaks()).toEqual([]);
  });

  it('should leave nothing staged after a failed drag', () => {
    const harness = createHarness({
      onReorder: () => 'not a resolution' as never,
    });

    activate(harness);
    harness.next(harness.gap(1));
    release(90);

    expect(harness.errors[0]!.code).toBe('consumer');

    press(harness.items[1]!);
    move(40);
    release(40);

    expect(leaks()).toEqual([]);
  });
});

describe('the displacement view lifetime', () => {
  /**
   * `PresentationView.insertion` is documented as meaningful **only** inside
   * the committed-move bracket, and the hook-facing `DisplacementView` declares
   * it non-null on that basis. A value left behind is a destination gap that
   * outlives the move it described.
   *
   * Driven directly, because every exit that has to clear it is a failure exit:
   * through the public surface the operation retires immediately afterwards and
   * the view is gone before anything could read it.
   */
  const runBracket = (
    overrides: Partial<SortableSlots> = {},
    foreignAnchor = false,
  ): Readonly<{ left: Insertion | null; threw: boolean }> => {
    const root = document.createElement('div');
    const items = [
      document.createElement('div'),
      document.createElement('div'),
    ];
    const placeholder = document.createElement('div');

    root.append(items[0]!, placeholder, items[1]!);
    document.body.append(root);
    cleanup.push(() => {
      root.remove();
    });

    const elsewhere = document.createElement('div');
    const stray = document.createElement('div');

    elsewhere.append(stray);
    document.body.append(elsewhere);
    cleanup.push(() => {
      elsewhere.remove();
    });

    const rt = createSortableRuntime(
      {
        realm: createRealm(root),
        root,
        dispatch: (): void => {},
        fail: (): void => {},
        cancel: (): void => {},
        closed: false,

        destroy: (): Promise<void> => Promise.resolve(),
      },
      items,
      [...items],
      { ...EMPTY_SLOTS, ...overrides },
    );

    rt.placeholder = placeholder;
    rt.view = {
      realm: rt.host.realm,
      placeholder,
      item: items[0]!,
      getBox: null,
      live: () => !rt.host.closed,
      snapshot: rt.snapshot,
      insertion: null,
    };

    const spec = createSortableSpec(rt);
    const current = {
      ...createSortableFramePart(),
      phase: ACTIVE,
      snapshot: rt.snapshot,
      item: items[0],
      // An end gap, so the placeholder genuinely has to move — an inert move
      // returns before the field is ever written.
      insertion: {
        version: 0,
        index: 1,
        before: foreignAnchor ? stray : items[1]!,
        after: null,
      },
    } as unknown as Parameters<typeof spec.action.effect>[2];

    let threw = false;

    try {
      spec.action.effect(TAG_SPATIAL, 1, current, STAGED);
    } catch {
      threw = true;
    }

    return { left: rt.view.insertion, threw };
  };

  it('should clear the gap after a successful bracket', () => {
    expect(runBracket()).toEqual({ left: null, threw: false });
  });

  it('should clear the gap when the placeholder write is refused', () => {
    // A cross-container anchor: the canonical writer throws rather than moving
    // the placeholder out of the list.
    expect(runBracket({}, true)).toEqual({ left: null, threw: true });
  });

  it('should clear the gap when the eager measurement fails', () => {
    const result = runBracket({
      measureInsertion: (): void => {
        throw new Error('measure failed');
      },
    });

    // Classified rather than thrown — `measureInSeam` narrows it — so this exit
    // is a plain `return` out of the middle of the bracket.
    expect(result).toEqual({ left: null, threw: false });
  });

  it('should clear the gap when the lazy invalidation fails', () => {
    const result = runBracket({
      invalidateInsertion: (): void => {
        throw new Error('invalidation failed');
      },
    });

    expect(result).toEqual({ left: null, threw: false });
  });

  it('should clear the gap when a beforeMove hook throws', () => {
    expect(
      runBracket({
        beforeMove: [
          (): void => {
            throw new Error('hook failed');
          },
        ],
      }),
    ).toEqual({ left: null, threw: true });
  });

  it('should clear the gap when an afterMove hook throws', () => {
    expect(
      runBracket({
        afterMove: [
          (): void => {
            throw new Error('hook failed');
          },
        ],
      }),
    ).toEqual({ left: null, threw: true });
  });

  it('should clear the gap the release settle published', () => {
    // Release reuses the `beforeMove` pipeline to make displacement features
    // hand back their offsets before it measures, so it opens the field too —
    // and the only reader between that call and retirement is
    // `resolveInsertion`, one line later, which must not see a gap.
    const root = document.createElement('div');
    const items = [
      document.createElement('div'),
      document.createElement('div'),
    ];
    const placeholder = document.createElement('div');

    root.append(items[0]!, placeholder, items[1]!);
    document.body.append(root);
    cleanup.push(() => {
      root.remove();
    });

    const rt = createSortableRuntime(
      {
        realm: createRealm(root),
        root,
        dispatch: (): void => {},
        fail: (): void => {},
        cancel: (): void => {},
        closed: false,

        destroy: (): Promise<void> => Promise.resolve(),
      },
      items,
      [...items],
      { ...EMPTY_SLOTS, beforeMove: [(): void => {}] },
    );

    rt.placeholder = placeholder;
    rt.view = {
      realm: rt.host.realm,
      placeholder,
      item: items[0]!,
      getBox: null,
      live: () => !rt.host.closed,
      snapshot: rt.snapshot,
      insertion: null,
    };

    const spec = createSortableSpec(rt);
    const draft = {
      ...createSortableFramePart(),
      phase: RELEASING,
      snapshot: rt.snapshot,
      item: items[0],
      insertion: { version: 0, index: 0, before: null, after: items[1]! },
    } as unknown as Parameters<typeof spec.release.prepare>[0];

    spec.release.prepare(draft);

    expect(rt.view.insertion).toBeNull();
  });

  it('should publish the gap to the hooks while the bracket is open', () => {
    // The counterpart: clearing it must not mean the hooks never see it.
    const seen: Array<Insertion | null> = [];

    runBracket({
      beforeMove: [
        (view): void => {
          seen.push(view.insertion);
        },
      ],
      afterMove: [
        (view): void => {
          seen.push(view.insertion);
        },
      ],
    });

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBeNull();
    expect(seen[1]).toBe(seen[0]);
  });
});

/**
 * The stretch sweep's own findings (Checkpoint D review 5, C5-03 §7).
 *
 * Each of these is a **frame write after the terminal barrier**: teardown
 * scrubs both frames and returns into the middle of a behavior callback, and
 * nothing scrubs them again — so a seed, a proposal or a domain value written
 * afterwards pins the item and its snapshot in an inactive frame of a
 * destroyed controller (I-36 (2) acts 1 and 2, I-20).
 *
 * Driven directly, because the consequence is kernel-private frame state that a
 * public drag cannot observe: the operation is declined either way, and what
 * these pin is what the *draft* holds when it is.
 */
describe('the terminal barrier on the behavior’s frame writes', () => {
  const bench = (
    overrides: Partial<SortableSlots>,
  ): Readonly<{
    rt: ReturnType<typeof createSortableRuntime>;
    /** The kernel stand-in, so a test can drive the latch D-53 made readonly. */
    host: { closed: boolean };
    spec: ReturnType<typeof createSortableSpec>;
    item: HTMLElement;
    root: HTMLElement;
  }> => {
    const root = document.createElement('div');
    const item = document.createElement('div');
    // Two, so a downward command is *feasible*: a single-item collection makes
    // `keyboardInsertion` return null and the command declines before it ever
    // reaches the seed, which would make the command case vacuous.
    const sibling = document.createElement('div');

    root.append(item, sibling);
    document.body.append(root);
    cleanup.push(() => {
      root.remove();
    });

    // `closed` is readonly on the real `KernelHost` (D-53) — a behavior may
    // consult the latch, never set it. These tests stand in for the kernel, so
    // the stub keeps it writable and hands it back for the test to drive.
    const host = {
      realm: createRealm(root),
      root,
      dispatch: (): void => {},
      fail: (): void => {},
      cancel: (): void => {},
      closed: false,
      destroy: (): Promise<void> => Promise.resolve(),
    };
    const rt = createSortableRuntime(host, [item, sibling], [item, sibling], {
      ...EMPTY_SLOTS,
      ...overrides,
    });

    return { rt, host, spec: createSortableSpec(rt), item, root };
  };

  /** An event whose composed path is exactly the item, as a press would be. */
  const pathEvent = (item: HTMLElement, key = 'ArrowDown'): Event =>
    ({
      key,
      composedPath: (): readonly EventTarget[] => [item],
      preventDefault: (): void => {},
    }) as unknown as Event;

  it('should seed no draft when the visual resolver destroys the controller', () => {
    const held = bench({
      getVisual: (element): HTMLElement => {
        held.host.closed = true;
        return element;
      },
    });
    const draft = {
      ...createSortableFramePart(),
    } as unknown as Parameters<typeof held.spec.admit>[1];

    const admitted = held.spec.admit(pathEvent(held.item) as never, draft);

    expect(admitted).toBeNull();
    expect([draft.item, draft.visual, draft.snapshot]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('should seed no command draft when the visual resolver destroys the controller', () => {
    // The command path writes a *fourth* field — the destination — so it needs
    // its own decline rather than only the shared seed's.
    const held = bench({
      getVisual: (element): HTMLElement => {
        held.host.closed = true;
        return element;
      },
    });
    const draft = {
      ...createSortableFramePart(),
    } as unknown as Parameters<typeof held.spec.admit>[1];

    const admitted = held.spec.command!.admit(pathEvent(held.item), draft);

    expect(admitted).toBeNull();
    expect([draft.item, draft.snapshot, draft.insertion]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('should build no proposal when a displacement hook destroys the controller', () => {
    const held = bench({
      beforeMove: [
        (): void => {
          held.host.closed = true;
        },
      ],
    });

    held.rt.view = {
      realm: held.rt.host.realm,
      placeholder: held.item,
      item: held.item,
      getBox: null,
      live: () => !held.host.closed,
      snapshot: held.rt.snapshot,
      insertion: null,
    };

    const insertion: Insertion = {
      version: 0,
      index: 0,
      before: null,
      after: null,
    };
    const draft = {
      ...createSortableFramePart(),
      phase: RELEASING,
      pointerId: POINTER_ID,
      snapshot: held.rt.snapshot,
      item: held.item,
      insertion,
    } as unknown as Parameters<typeof held.spec.release.prepare>[0];

    expect(held.spec.release.prepare(draft)).toEqual({ invoke: null });
    expect(draft.proposal).toBeNull();
  });

  it('should start nothing when a survival conjunct destroys the controller', () => {
    // `isConnected` and `nextElementSibling` are accessors on elements the
    // consumer owns, so the reading taken right after `after()` does not cover
    // them. Everything below them publishes this operation's DOM into a runtime
    // `retire()` has already nulled, and then calls `onStart` — a declared
    // consumer callback after the terminal barrier (I-36 (2) acts 1 and 4).
    //
    // Both accessors have to be *instrumented* to reach it, and that is the
    // finding rather than a caveat: teardown removes the placeholder, so honest
    // accessors make the survival test throw instead. A custom element that
    // proxies either one turns that second line of defence off, and the library
    // must not depend on the consumer's accessors telling the truth.
    const built: HTMLElement[] = [];
    let harness: Harness | null = null;

    harness = createHarness({
      createPlaceholder: (): HTMLElement => {
        const element = document.createElement('div');
        let reads = 0;

        Object.defineProperty(element, 'isConnected', {
          get: (): boolean => {
            reads += 1;

            // The adoption check inside `createPlaceholder` reads it first and
            // requires a detached element; the survival test is the second.
            if (reads === 1) {
              return false;
            }

            void harness!.controller.destroy();
            return true;
          },
        });
        built.push(element);
        return element;
      },
    });

    Object.defineProperty(harness.items[0]!, 'nextElementSibling', {
      get: (): Element | null => built[0] ?? null,
    });

    activate(harness);

    expect(built).toHaveLength(1);
    expect(harness.started).toEqual([]);
  });

  it('should build no proposal when the axis destroys the controller while resolving the release', () => {
    // The second stretch that ends at the same reading: the axis measures the
    // consumer-owned placeholder *after* its candidate loop, so a resolution
    // can return a fresh insertion on a controller that no longer exists.
    const held = bench({
      resolveInsertion: (): Insertion => {
        held.host.closed = true;
        return { version: 0, index: 0, before: null, after: null };
      },
    });

    held.rt.view = {
      realm: held.rt.host.realm,
      placeholder: held.item,
      item: held.item,
      getBox: null,
      live: () => !held.host.closed,
      snapshot: held.rt.snapshot,
      insertion: null,
    };

    const draft = {
      ...createSortableFramePart(),
      phase: RELEASING,
      pointerId: POINTER_ID,
      snapshot: held.rt.snapshot,
      item: held.item,
      insertion: { version: 0, index: 0, before: null, after: null },
    } as unknown as Parameters<typeof held.spec.release.prepare>[0];

    expect(held.spec.release.prepare(draft)).toEqual({ invoke: null });
    expect(draft.proposal).toBeNull();
  });

  it('should re-anchor nothing when a re-anchor conjunct destroys the controller', () => {
    // Teardown has already removed the placeholder, so `item.before()` after a
    // destroy re-inserts a footprint the operation has finished with — into the
    // consumer's list, where nothing removes it again (I-36 (2) act 3).
    const held = bench({});
    const placeholder = document.createElement('div');

    // In the list, after both items: the conjuncts compare the item's parent
    // with the placeholder's, so a detached placeholder would short-circuit and
    // make the case vacuous. In a real teardown it *is* detached — but a
    // consumer element that proxies `parentElement` turns that off, which is
    // why the barrier is a reading rather than a DOM coincidence.
    held.root.append(placeholder);
    held.rt.placeholder = placeholder;

    Object.defineProperty(held.item, 'isConnected', {
      get: (): boolean => {
        held.host.closed = true;
        return true;
      },
    });

    const current = {
      ...createSortableFramePart(),
      item: held.item,
      recovery: RECOVERY_DESTINATION,
    } as unknown as Parameters<typeof held.spec.anchorTarget>[0];

    expect(held.spec.anchorTarget(current)).toEqual({ x: 0, y: 0 });
    // Unmoved: the placeholder is still last, not dragged up beside the item.
    expect(held.root.lastElementChild).toBe(placeholder);
  });

  it('should publish no domain when the resolution’s own accessor destroys the controller', () => {
    // `isReorderResolution` is a duck-type test on `.type`, so every field of
    // the resolution is an accessor on an object the consumer built.
    const held = bench({});
    const draft = {
      ...createSortableFramePart(),
      proposal: { request: {}, from: 0, to: 0 },
    } as unknown as Parameters<typeof held.spec.settlement.prepare>[0];

    const value = {
      get type(): string {
        held.host.closed = true;
        return 'accepted';
      },
    };

    expect(
      held.spec.settlement.prepare(draft, {
        type: SETTLED_FULFILLED,
        value,
      } as never),
    ).toBe(true);
    expect(draft.domain).toBeNull();
  });
});
