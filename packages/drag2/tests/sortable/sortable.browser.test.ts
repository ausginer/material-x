import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_ACTIVATION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_TARGET,
  FAILURE_PLACEHOLDER_MOVE,
  FAILURE_RELEASE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_RENDERER_WRITE,
  FAILURE_SCHEDULED_FRAME,
  type FailureStage,
} from '../../src/kernel/failures.ts';
import {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  RELEASING,
  SETTLING,
} from '../../src/kernel/phases.ts';
import { createRealm } from '../../src/kernel/realm.ts';
import type { LandingHandle, LandingStart } from '../../src/kernel/spec.ts';
import { createSortableBehavior } from '../../src/sortable/behavior.ts';
import type { SortableController } from '../../src/sortable/controller.ts';
import {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  ReorderResolution,
  type ReorderRequest,
  type SortableCancelResult,
  type SortableFinishResult,
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
  finishes: SortableFinishResult[];
  cancels: SortableCancelResult[];
  errors: Array<Readonly<{ stage: FailureStage; error: unknown }>>;
  requests: ReorderRequest[];
  /** The item each `onStart` received. */
  started: HTMLElement[];
  /** What the next `resolveInsertion` returns. Consumed once. */
  next(insertion: Insertion | null): void;
  /** The insertion for a destination gap index, against the live snapshot. */
  gap(index: number, dragged?: HTMLElement): Insertion;
  placeholder(): HTMLElement | null;
  snapshot(): CollectionSnapshot;
}>;

type Overrides = Partial<
  Pick<
    SortableSlots,
    | 'onReorder'
    | 'getHandle'
    | 'getVisual'
    | 'createPlaceholder'
    | 'invalidateInsertion'
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
    itemCount?: number;
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
  const finishes: SortableFinishResult[] = [];
  const cancels: SortableCancelResult[] = [];
  const errors: Array<Readonly<{ stage: FailureStage; error: unknown }>> = [];
  const requests: ReorderRequest[] = [];
  const started: HTMLElement[] = [];

  let queued: Insertion | null = null;
  let published: CollectionSnapshot = { items: [...items], version: 0 };

  let harness!: Harness;

  const slots: SortableSlots = {
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
    startLanding: overrides.startLanding ?? null,
    onFinish(result): void {
      calls.push('onFinish');
      finishes.push(result);
    },
    onCancel(result): void {
      calls.push('onCancel');
      cancels.push(result);
    },
    onError(error, context): void {
      calls.push('onError');
      errors.push({ stage: context.stage, error });
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
  };

  cleanup.push(() => {
    controller.destroy();
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

const pointerEvent = (type: string, x: number, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
};

const move = (y: number): void => {
  pointerEvent('pointermove', 10, y);
};

const release = (y: number): void => {
  pointerEvent('pointerup', 10, y);
};

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
  onReorder: () => ReorderResolution.accept(),
  onStart: (): void => {},
  createPlaceholder: null,
  getHandle: null,
  getVisual: null,
  startLanding: null,
  onFinish: (): void => {},
  onCancel: (): void => {},
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

  it('should preventDefault only when it admits', () => {
    const harness = createHarness();
    const admitted = press(harness.items[0]!);

    expect(admitted.defaultPrevented).toBe(true);

    harness.controller.cancel('reset');

    const ignored = press(harness.root);

    expect(ignored.defaultPrevented).toBe(false);
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
      harness.controller.updateItems([...harness.items]);
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
      harness.controller.updateItems([...harness.items]);
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
      harness.controller.updateItems([...harness.items].reverse());
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
      harness.controller.updateItems(harness.items.slice(1));
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
      harness.controller.updateItems(harness.items.slice(0, 2));
      harness.controller.updateItems([...harness.items]);
    });

    harness = createHarness({
      getHandle(item) {
        replace();
        return item;
      },
    });

    activate(harness);
    release(40);

    // Both landed, in order: the second is the published collection, and it is
    // version 2 rather than a single collapsed update.
    expect(harness.snapshot().version).toBe(2);
    expect(harness.snapshot().items).toEqual(harness.items);
  });

  it('should treat destroy from the handle resolver as an immediate terminal barrier', () => {
    let harness!: Harness;
    const terminate = once(() => {
      harness.controller.destroy();
      // Queued behind a closed queue: it must never be drained.
      harness.controller.updateItems([...harness.items].reverse());
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

  it('should treat destroy from the visual resolver as an immediate terminal barrier', () => {
    let harness!: Harness;
    const terminate = once(() => {
      harness.controller.destroy();
      harness.controller.updateItems([...harness.items].reverse());
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
    harness.controller.updateItems([harness.items[1]!, harness.items[2]!]);
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
      harness.controller.destroy();
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_ACTIVATION);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_ACTIVATION);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_ACTIVATION);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_ACTIVATION);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_ACTIVATION);
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
      harness.controller.destroy();
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

  it('should classify an incoherent insertion instead of dropping silently', () => {
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

    // Reporting a broken invariant as a successful no-op drop would tell the
    // consumer the drag completed normally.
    expect(harness.errors[0]!.stage).toBe(FAILURE_RELEASE);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_REORDER_RESOLUTION);
    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toEqual([]);
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

    // A resolver malfunction is never reported as `onCancel`.
    expect(harness.errors[0]).toEqual({
      stage: FAILURE_REORDER_RESOLUTION,
      error,
    });
    expect(harness.cancels).toEqual([]);
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

  it('should report a classified failure through onError only', () => {
    const harness = createHarness();

    activate(harness);
    // A renderer write failure on the hot path.
    Object.defineProperty(harness.items[0]!.style, 'transform', {
      configurable: true,
      get: (): string => '',
      set(): never {
        throw new Error('cssom');
      },
    });
    move(60);

    expect(harness.errors[0]!.stage).toBe(FAILURE_RENDERER_WRITE);
    expect(harness.finishes).toEqual([]);
    expect(harness.cancels).toEqual([]);
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

  it('should not re-anchor while readiness is pending', () => {
    const runner = createRunner();
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      onReorder: () =>
        ReorderResolution.accept(
          new Promise<void>((resolve) => {
            ready = resolve;
          }),
        ),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    // `authoredReady` is false with a promise pending: the consumer has not
    // committed, so re-anchoring now would drag the placeholder back beside the
    // item's OLD slot. The provisional target is the gap as it stands.
    expect(order(harness)).toBe('012_');

    ready();
  });

  it('should re-anchor once readiness settles', async () => {
    const runner = createRunner();
    let ready!: () => void;
    const harness = createHarness({
      startLanding: runner.start,
      onReorder: () =>
        ReorderResolution.accept(
          new Promise<void>((resolve) => {
            ready = resolve;
          }),
        ),
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);
    ready();
    await nextFrame();

    // The consumer's DOM is committed now, so the authoritative anchor — the
    // item — is where the placeholder belongs.
    expect(order(harness)).toBe('_012');
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
    harness.controller.updateItems([
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
        harness.controller.updateItems([
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
    harness.controller.updateItems([
      harness.items[1]!,
      harness.items[2]!,
      harness.items[3]!,
    ]);

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
    harness.controller.updateItems([
      harness.items[1]!,
      harness.items[2]!,
      harness.items[3]!,
    ]);

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
    harness.controller.updateItems([
      harness.items[1]!,
      harness.items[2]!,
      harness.items[3]!,
    ]);

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

    harness.controller.updateItems(replacement);
    // Pressing the item that is now first proves the new snapshot is live.
    press(harness.items[2]!);
    move(40);

    expect(harness.calls).toContain('onStart');
  });

  it('should copy the caller array at call time', () => {
    const harness = createHarness();
    const mutable = [harness.items[1]!, harness.items[0]!];

    harness.controller.updateItems(mutable);
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
    harness.controller.updateItems([
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
    harness.controller.updateItems([
      harness.items[0]!,
      harness.items[2]!,
      harness.items[1]!,
    ]);

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
    harness.controller.updateItems([
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
    harness.controller.updateItems([
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
    harness.controller.updateItems([
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

    expect(harness.errors[0]!.stage).toBe(FAILURE_RELEASE);
    expect(harness.finishes).toEqual([]);
  });

  it('should cancel with item-removed when the dragged item vanishes', () => {
    const harness = createHarness();

    activate(harness);
    harness.controller.updateItems([harness.items[1]!, harness.items[2]!]);

    expect(harness.cancels[0]).toMatchObject({
      type: 'canceled',
      reason: CANCEL_ITEM_REMOVED,
    });
  });

  it('should apply an update from inside onStart at ACTIVATING', async () => {
    const harness = createHarness({
      itemCount: 4,
      onStart(each): void {
        each.controller.updateItems([
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
        harness.controller.updateItems([harness.items[2]!, harness.items[1]!]);
        return ReorderResolution.accept();
      },
    });

    activate(harness);
    harness.next(harness.gap(2));
    release(60);

    expect(harness.finishes[0]!.proposal.snapshot.items).toHaveLength(3);
    expect(harness.finishes[0]!.proposal.request.version).toBe(0);
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
  it('should give two updates queued in one drain distinct versions', () => {
    // Both replacements preserve the incumbent gap, so neither cancels; the
    // only thing under test is the version each is stamped with. Queued from
    // `onStart`, they append to a drain already running, so neither has
    // published when the other is minted.
    const harness = createHarness({
      onStart(h): void {
        h.controller.updateItems([h.items[0]!, h.items[1]!, h.items[2]!]);
        h.controller.updateItems([h.items[0]!, h.items[1]!, h.items[2]!]);
      },
    });

    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.calls).not.toContain('onCancel');
      expect(harness.snapshot().version).toBe(2);
    });
  });

  it('should keep versions increasing across separate drains', () => {
    const harness = createHarness();

    harness.controller.updateItems([harness.items[0]!, harness.items[1]!]);
    harness.controller.updateItems([harness.items[0]!, harness.items[2]!]);
    activate(harness);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.snapshot().version).toBe(2);
    });
  });

  it('should refuse a duplicated element at construction', () => {
    const root = document.createElement('div');
    const item = document.createElement('div');

    root.append(item);
    document.body.append(root);
    cleanup.push(() => root.remove());

    expect(() =>
      draggable(root, createSortableBehavior([item, item], EMPTY_SLOTS)),
    ).toThrow(/same element twice/u);
  });

  it('should refuse a duplicated element in updateItems', () => {
    const harness = createHarness();

    expect(() =>
      harness.controller.updateItems([harness.items[0]!, harness.items[0]!]),
    ).toThrow(/same element twice/u);
  });

  it('should not queue an update it refused', () => {
    const harness = createHarness();

    activate(harness);

    try {
      harness.controller.updateItems([harness.items[1]!, harness.items[1]!]);
    } catch {
      // expected
    }

    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.snapshot().version).toBe(0);
      expect(harness.calls).not.toContain('onCancel');
    });
  });

  it('should not consume a version for an update it refused', () => {
    // The refused call produced no snapshot, so it must not leave a gap in the
    // sequence: the next *valid* update is the first collection that exists
    // after the initial one, and it has to be numbered as such.
    const harness = createHarness();

    activate(harness);

    expect(() =>
      harness.controller.updateItems([harness.items[1]!, harness.items[1]!]),
    ).toThrow(/same element twice/u);

    harness.controller.updateItems([
      harness.items[0]!,
      harness.items[1]!,
      harness.items[2]!,
    ]);
    harness.next(null);
    move(80);

    return nextFrame().then(() => {
      expect(harness.snapshot().version).toBe(1);
    });
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

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_INVALIDATION,
    ]);
  });

  it('should classify an activation-time invalidation failure as its own stage', () => {
    // Not `FAILURE_ACTIVATION`: the surrounding seam would otherwise name the
    // wrong thing in `DragErrorContext.stage`.
    const harness = createHarness({
      invalidateInsertion: (): void => {
        throw new Error('invalidation failed');
      },
    });

    activate(harness);

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_INVALIDATION,
    ]);
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

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_SCHEDULED_FRAME,
    ]);
  });
});

describe('placeholder factory results', () => {
  it('should refuse the dragged item as its own placeholder', () => {
    const harness = createHarness({
      createPlaceholder: ({ item }) => item,
    });

    activate(harness);

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_ACTIVATION,
    ]);
  });

  it('should leave the dragged item in the document when it was refused', () => {
    // The teardown disposer removes whatever was adopted as the placeholder.
    // Adopting the item therefore *deleted* it once the drag ended.
    const harness = createHarness({
      createPlaceholder: ({ item }) => item,
    });

    activate(harness);
    release(40);

    expect(harness.root.contains(harness.items[0]!)).toBe(true);
  });

  it('should refuse the lifted visual as the placeholder', () => {
    const harness = createHarness({
      createPlaceholder: ({ visual }) => visual,
    });

    activate(harness);

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_ACTIVATION,
    ]);
  });

  it('should refuse a node that is already in the document', () => {
    const outside = document.createElement('div');

    document.body.append(outside);
    cleanup.push(() => outside.remove());

    const harness = createHarness({
      createPlaceholder: () => outside,
    });

    activate(harness);

    expect(outside.parentElement).toBe(document.body);
  });

  it('should refuse a result that is not an element', () => {
    const harness = createHarness({
      createPlaceholder: () => ({}) as unknown as HTMLElement,
    });

    activate(harness);

    expect(harness.errors.map((error) => error.stage)).toEqual([
      FAILURE_ACTIVATION,
    ]);
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
        destroy: (): void => {},
      },
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
      expect(harness.errors[0]!.stage).toBe(FAILURE_PLACEHOLDER_MOVE);
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
    expect(harness.errors[0]!.stage).toBe(FAILURE_RELEASE);
    expect(foreign.children).toHaveLength(1);
  });

  it('should refuse a home recovery whose anchor left the container', () => {
    const harness = createHarness();

    activate(harness);

    const foreign = foreignContainer();

    foreign.append(harness.items[1]!);
    harness.controller.cancel('gone');

    // Home recovery runs inside `anchorTarget`, so it classifies at the landing
    // target stage and the terminal callback is skipped for the outcome the
    // checkpoint is about to replace.
    expect(harness.errors[0]!.stage).toBe(FAILURE_LANDING_TARGET);
    expect(harness.calls).not.toContain('onCancel');
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
        error instanceof Error && error.message.includes('never consumed'),
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

    expect(harness.errors[0]!.stage).toBe(FAILURE_REORDER_RESOLUTION);

    press(harness.items[1]!);
    move(40);
    release(40);

    expect(leaks()).toEqual([]);
  });
});
