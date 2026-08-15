/**
 * **Discrete input — the keyboard command (D-32).**
 *
 * A command is a **complete one-slot operation**: admit, activate, release,
 * resolve, settle, land, retire. Everything from `ACTIVATE` on is the code the
 * pointer path runs, which is the claim the revision rests on — so this suite
 * spends most of its assertions on the two places that are genuinely different
 * (ingress, and the three seams that branch on `pointerId`) and one on the
 * property that makes the rest of it uninteresting: **the two input modes
 * produce identical proposals.**
 *
 * Layout: three 40px items stacked from y=0.
 *
 * ## Why the destination rows are set up the way they are
 *
 * The command path and the spatial path have to be made to *disagree* before an
 * assertion about the command path proves anything. A pointerless operation's
 * pointer scalars are zero, so a spatial resolve would run from `pointerY === 0`
 * — the top of the viewport, i.e. the first gap. The fixtures therefore command
 * items **downward**, where the spatial answer would be visibly different, and
 * an assertion that the gap survived is an assertion that nothing re-resolved.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LandingContext } from '../../src/kernel/spec.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableConfig,
  type SortableController,
  type ReorderTransactionResult,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 44;
const ITEM_HEIGHT = 40;

type Fixture = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  requests: ReorderRequest[];
  finishes: ReorderTransactionResult[];
  cancels: ReorderTransactionResult[];
  errors: unknown[];
  started: HTMLElement[];
  /** Landing contexts, when a recording runner is installed. */
  contexts: LandingContext[];
  /** Every item the installed `handle` resolver was asked about, in order. */
  handleCalls: HTMLElement[];
  /** Swap the collection identity and signal it (D-44). */
  replace(next: readonly HTMLElement[]): void;
  placeholder(): HTMLElement | null;
  /** DOM order, with the placeholder as `_`. */
  order(): string;
}>;

type Options = Readonly<{
  itemCount?: number;
  onReorder?(request: ReorderRequest, fixture: Fixture): ReorderResolution;
  onStart?(fixture: Fixture): void;
  /** Fill the `handle` slot, narrowing admission to the row's first child. */
  useHandle?: boolean;
  /**
   * Runs inside the `handle` resolver, which is consumer code the library
   * invokes during admission. Implies `useHandle`.
   */
  onResolveHandle?(fixture: Fixture): void;
  /**
   * Called from **inside** the admission member, through the `visual` slot.
   *
   * This is the only honest way to reach that window from a test: a capture
   * -phase listener on the root runs *before* the kernel's own listener, so it
   * dispatches while no ingress transaction is open at all — which drains
   * immediately and proves nothing about re-entry.
   */
  onAdmit?(fixture: Fixture): void;
  /** Install a landing runner that records its context and never completes. */
  recordLanding?: boolean;
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

function build(options: Options = {}): Fixture {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.itemCount ?? 3); i += 1) {
    const item = document.createElement('div');
    const grip = document.createElement('span');

    grip.className = 'grip';
    item.append(grip);
    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const requests: ReorderRequest[] = [];
  const finishes: ReorderTransactionResult[] = [];
  const cancels: ReorderTransactionResult[] = [];
  const errors: unknown[] = [];
  const started: HTMLElement[] = [];
  const contexts: LandingContext[] = [];
  const handleCalls: HTMLElement[] = [];

  let fixture!: Fixture;

  // Fragments, not features (D-45): each is a plain partial config, and the
  // library merges them. `handle` and `visual` are ordinary config slots now,
  // so the conditional pushes build object literals rather than call factories.
  const fragments: Array<Partial<SortableConfig>> = [];

  if (options.useHandle === true || options.onResolveHandle !== undefined) {
    fragments.push({
      handle: (item) => {
        handleCalls.push(item);
        options.onResolveHandle?.(fixture);
        return item.querySelector('.grip');
      },
    });
  }

  if (options.onAdmit !== undefined) {
    fragments.push({
      visual: (item) => {
        options.onAdmit?.(fixture);
        return item;
      },
    });
  }

  if (options.recordLanding === true) {
    // D-63: a recording runner is authored at the middle tier now.
    fragments.push({
      landing: () => ({
        startLanding(context) {
          contexts.push(context);
          return { destroy: (): void => {} };
        },
      }),
    });
  }

  // D-44's pull source; `replace()` swaps the identity and signals.
  let current: readonly HTMLElement[] = items;
  const controller = sortable(
    root,
    {
      items: () => current,
      axis: y(),
      onReorder(request) {
        requests.push(request);

        return (
          options.onReorder?.(request, fixture) ?? ReorderResolution.accept()
        );
      },
      onStart(item): void {
        started.push(item);
        options.onStart?.(fixture);
      },
      onEnd(result): void {
        // D-62: one callback, and the fixture keeps the two arrays this suite's
        // assertions are written against.
        if (result.type === 'accepted' || result.type === 'noop') {
          finishes.push(result);
        } else {
          cancels.push(result);
        }
      },
      onError(error): void {
        errors.push(error);
      },
    },
    ...fragments,
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  fixture = {
    root,
    items,
    controller,
    requests,
    finishes,
    cancels,
    errors,
    started,
    contexts,
    handleCalls,
    /** New array identity, then the signal — D-44's structural branch. */
    replace: (next: readonly HTMLElement[]): void => {
      current = next;
      controller.invalidate();
    },
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
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

  return fixture;
}

/** Dispatch an arrow key from `target`. Returns whether the default survived. */
const arrow = (target: HTMLElement, key: string): boolean => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  });

  target.dispatchEvent(event);
  return !event.defaultPrevented;
};

const press = (target: HTMLElement, y: number): boolean => {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: POINTER_ID,
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: 10,
    clientY: y,
  });

  target.dispatchEvent(event);
  return !event.defaultPrevented;
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

/**
 * Grab row `index` where it actually is.
 *
 * Every pointer coordinate here is **measured**, never computed from the item
 * index: a fixture is appended to `document.body` in normal flow, so a test that
 * builds two of them puts the second one a list-height further down the
 * viewport. Assuming `index * ITEM_HEIGHT` silently drags the wrong fixture's
 * empty space, which produces a no-op proposal that looks like a real failure of
 * whatever the test was about.
 */
const grab = (fixture: Fixture, index: number): number =>
  fixture.items[index]!.getBoundingClientRect().top;

/** A full pointer drag of row `index` to just past row `over`'s centre. */
const dragPast = async (
  fixture: Fixture,
  index: number,
  over: number,
): Promise<void> => {
  const from = grab(fixture, index);
  const target = fixture.items[over]!.getBoundingClientRect();

  press(fixture.items[index]!, from + 10);
  pointerEvent('pointermove', from + 30);
  pointerEvent('pointermove', target.top + target.height / 2 + 5);
  await nextFrame();
  pointerEvent('pointerup', target.top + target.height / 2 + 5);
};

describe('command ingress', () => {
  it('should run a complete one-slot operation from a single arrow key', () => {
    const fixture = build();

    // Admit, activate, release, resolve, settle, retire — all of it inside the
    // one drain the listener opens, because nothing on this path is async.
    expect(arrow(fixture.items[0]!, 'ArrowDown')).toBe(false);

    expect(fixture.started).toEqual([fixture.items[0]]);
    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.placeholder()).toBeNull();
    expect(fixture.errors).toEqual([]);
  });

  it('should leave an edge item inert and keep the key native', () => {
    const fixture = build();

    // `keyboardInsertion` yields `null` at the edge, `command.admit` declines,
    // and the kernel does **not** prevent the default — so the arrow key keeps
    // whatever meaning the page gives it (I-32). This is the entire reason
    // feasibility has to be answered inside the listener.
    expect(arrow(fixture.items[0]!, 'ArrowUp')).toBe(true);

    expect(fixture.started).toEqual([]);
    expect(fixture.requests).toEqual([]);
    expect(fixture.placeholder()).toBeNull();
  });

  it('should ignore a key that names no command', () => {
    const fixture = build();

    expect(arrow(fixture.items[0]!, 'Enter')).toBe(true);
    expect(fixture.started).toEqual([]);
  });

  it('should ignore an arrow key outside any item', () => {
    const fixture = build();

    expect(arrow(fixture.root, 'ArrowDown')).toBe(true);
    expect(fixture.started).toEqual([]);
  });

  it('should treat ArrowLeft as ArrowUp and ArrowRight as ArrowDown', () => {
    // Ledger L-4: a keyboard reorder moves an item one slot through the
    // *collection*, which is one-dimensional whatever the layout is. This is
    // why the adapter lives in the behavior and not in `y()`, and why
    // Phase 17 inherits no keyboard question from this one.
    const horizontal = build();

    arrow(horizontal.items[0]!, 'ArrowRight');

    expect(horizontal.requests[0]).toMatchObject({ from: 0, to: 1 });

    const back = build();

    arrow(back.items[2]!, 'ArrowLeft');

    expect(back.requests[0]).toMatchObject({ from: 2, to: 1 });
  });

  it('should leave a press untouched whether or not it admits', () => {
    const fixture = build({ useHandle: true });

    // **The two ingresses part company here** (D-54). The kernel still owns the
    // call in both modes (C-03), but a press is no longer where the pointer
    // path makes it: `pointerdown` is before the threshold, so a press on the
    // grip that never travels must keep its focus and its click exactly as a
    // press outside the grip does. The keyboard half is asserted next door,
    // where the call *stays* in the listener because a `keydown` default cannot
    // be prevented after it returns.
    const y = grab(fixture, 0) + 10;

    expect(press(fixture.items[0]!, y)).toBe(true);
    expect(press(fixture.items[0]!.firstElementChild as HTMLElement, y)).toBe(
      true,
    );
  });

  it('should gate the keyboard path through handle() as well', () => {
    // Parity, not incidental: the shipped package shares one admission rule
    // across both listeners, so a handle narrows both.
    const fixture = build({ useHandle: true });

    expect(arrow(fixture.items[0]!, 'ArrowDown')).toBe(true);
    expect(fixture.started).toEqual([]);

    expect(
      arrow(fixture.items[0]!.firstElementChild as HTMLElement, 'ArrowDown'),
    ).toBe(false);
    expect(fixture.started).toEqual([fixture.items[0]]);
  });

  it('should resolve the handle exactly once per admitted keydown', () => {
    // D1. `command.admit` resolved the item once to compute the destination and
    // a second time to seed the draft, so one keydown invoked the consumer's
    // resolver twice while the press path invoked it once. A stateful resolver
    // can decline or throw on the second call, so this is observable and not
    // merely duplicate work.
    const fixture = build({ useHandle: true });

    arrow(fixture.items[0]!.firstElementChild as HTMLElement, 'ArrowDown');

    expect(fixture.handleCalls).toEqual([fixture.items[0]]);
    expect(fixture.started).toEqual([fixture.items[0]]);
  });

  it('should resolve the handle exactly once for a declined keydown', () => {
    // The edge item: feasibility is decided before the draft is seeded, so an
    // infeasible command resolves the item once and then stops. Pinned
    // separately because the fix moved the seeding *after* the edge test.
    const fixture = build({ useHandle: true });

    expect(
      arrow(fixture.items[0]!.firstElementChild as HTMLElement, 'ArrowUp'),
    ).toBe(true);
    expect(fixture.handleCalls).toEqual([fixture.items[0]]);
    expect(fixture.started).toEqual([]);
  });

  it('should resolve the handle the same number of times as a press does', () => {
    // The parity statement the two rows above only imply separately: both
    // ingresses share one admission rule, so they must consult the consumer's
    // resolver the same number of times for the same item.
    const pressed = build({ useHandle: true });
    const commanded = build({ useHandle: true });

    press(
      pressed.items[0]!.firstElementChild as HTMLElement,
      grab(pressed, 0) + 10,
    );
    arrow(commanded.items[0]!.firstElementChild as HTMLElement, 'ArrowDown');

    expect(commanded.handleCalls).toEqual(pressed.handleCalls);
  });

  it('should queue an admission-resolver invalidate() exactly once per keydown', () => {
    // The sharp end of D1. An admission resolver is explicitly allowed to queue
    // `invalidate()`, so resolving twice queued that side effect twice and the
    // operation reconciled through two snapshots for one native command — two
    // versions consumed and two collection actions drained for one arrow key.
    const versions: number[] = [];
    const fixture = build({
      onResolveHandle(f): void {
        f.replace([...f.items]);
      },
      onReorder(request): ReorderResolution {
        versions.push(request.version);
        return ReorderResolution.accept();
      },
    });

    arrow(fixture.items[0]!.firstElementChild as HTMLElement, 'ArrowDown');

    // One resolution, therefore one queued update, therefore version 1 — not 2.
    expect(fixture.handleCalls).toEqual([fixture.items[0]]);
    expect(versions).toEqual([1]);
    expect(fixture.errors).toEqual([]);
  });
});

describe('the pointerless lifecycle', () => {
  it('should never be advanced by a synthetic pointer event', () => {
    // I-33. No pointer listeners are armed at all for a pointerless operation,
    // so `MOVE`, `UP` and `lostpointercapture` are structurally unreachable
    // rather than defended by a `pointerId` comparison. The command has already
    // completed by the time these fire, and they must change nothing.
    const fixture = build();

    arrow(fixture.items[0]!, 'ArrowDown');

    const settled = fixture.order();

    pointerEvent('pointermove', 100);
    pointerEvent('pointerup', 100);
    pointerEvent('lostpointercapture', 100);

    expect(fixture.order()).toBe(settled);
    expect(fixture.finishes).toHaveLength(1);
  });

  it('should acquire no pointer capture', () => {
    const fixture = build();
    const captures: number[] = [];

    fixture.root.setPointerCapture = (id): void => {
      captures.push(id);
    };

    arrow(fixture.items[0]!, 'ArrowDown');

    expect(captures).toEqual([]);
    expect(fixture.finishes).toHaveLength(1);
  });

  it('should be cancelled by Escape exactly as a press is', () => {
    // Escape rides the cancellation lifetime, which is armed identically on both
    // paths: a command is a live operation with a placeholder and a lift.
    const fixture = build({
      onStart(self) {
        // The only window there is — a command releases on the drain after
        // `START_COMMITTED`, so `onStart` is where an outside actor can still
        // reach it.
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        void self;
      },
    });

    arrow(fixture.items[0]!, 'ArrowDown');

    expect(fixture.cancels).toHaveLength(1);
    expect(fixture.finishes).toEqual([]);
    expect(fixture.placeholder()).toBeNull();
  });

  it('should release every ingress listener on destroy', () => {
    const fixture = build();

    void fixture.controller.destroy();

    expect(arrow(fixture.items[0]!, 'ArrowDown')).toBe(true);
    expect(fixture.started).toEqual([]);
  });
});

describe('the command destination', () => {
  it('should survive activation instead of being reseeded to home', () => {
    // C4-01: the normative activation seeded home *unconditionally*, which
    // destroys the only state carrying the command's gap. The item is commanded
    // **down**, so a home seed would leave the placeholder in slot 0 and the
    // final order would be unchanged.
    const fixture = build();

    arrow(fixture.items[0]!, 'ArrowDown');

    expect(fixture.requests[0]!.from).toBe(0);
    expect(fixture.requests[0]!.to).toBe(1);
  });

  it('should survive release instead of being re-resolved spatially', () => {
    // The pointer scalars are zero on this path, so a spatial resolve would run
    // from `pointerY === 0` and select the **first** gap. Commanding row 1
    // downward makes the two answers disagree: the command says gap 2, a
    // spatial resolve would say gap 0.
    const fixture = build();

    arrow(fixture.items[1]!, 'ArrowDown');

    expect(fixture.requests[0]!.from).toBe(1);
    expect(fixture.requests[0]!.to).toBe(2);
    // A spatial resolve from `pointerY === 0` would have said gap 0.
    expect(fixture.requests[0]!.to).not.toBe(0);
  });

  it('should build the landing origin from a visual that never moved', () => {
    // `release.effect` performs **no** lift write on this path: there is no
    // release sample, and the visual has not moved since acquisition. `(0, 0)`
    // is therefore the correct landing origin rather than a missing one, and
    // the landing travels from the item's grab box to the anchor of its new gap.
    const fixture = build({ recordLanding: true });

    arrow(fixture.items[1]!, 'ArrowDown');

    expect(fixture.contexts).toHaveLength(1);
    expect(fixture.contexts[0]!.from).toEqual({ x: 0, y: 0 });
  });
});

describe('proposal equivalence', () => {
  it('should produce identical proposals for the same destination gap', async () => {
    // **The Phase 16 done-when, asserted directly rather than inferred.** Both
    // paths hand the same `insertion` to the same `buildReorderProposal` against
    // the same snapshot, so this is a statement about one code path — but only
    // an executable comparison can show that the *branch* did not diverge.
    const commanded = build();

    arrow(commanded.items[0]!, 'ArrowDown');

    const dragged = build();

    // The same destination by pointer: row 0 dropped past row 1's centre.
    await dragPast(dragged, 0, 1);

    const a = commanded.requests[0]!;
    const b = dragged.requests[0]!;

    expect(commanded.requests).toHaveLength(1);
    expect(dragged.requests).toHaveLength(1);
    expect([a.version, a.from, a.to]).toEqual([b.version, b.from, b.to]);
    // Identity neighbours too, compared by index rather than by node, because
    // the two fixtures own different elements.
    expect(commanded.items.indexOf(a.before!)).toBe(
      dragged.items.indexOf(b.before!),
    );
    expect(commanded.items.indexOf(a.after!)).toBe(
      dragged.items.indexOf(b.after!),
    );
  });

  it('should reach the terminal callback through the pointer path', () => {
    const fixture = build({
      onReorder: () => ReorderResolution.reject('no'),
    });

    arrow(fixture.items[0]!, 'ArrowDown');

    // The settlement mapping, the home recovery and the terminal routing are
    // the pointer path's, unmodified.
    expect(fixture.cancels).toHaveLength(1);
    expect(fixture.cancels[0]!.type).toBe('rejected');
    // Home recovery: the placeholder went back to the grab slot before the
    // presentation was released, and the library never reorders the DOM itself.
    expect(fixture.placeholder()).toBeNull();
    expect(fixture.order()).toBe('012');
  });
});

describe('a command against a live operation', () => {
  it('should be refused while a press is pending', () => {
    const fixture = build();

    press(fixture.items[0]!, grab(fixture, 0) + 10);

    // `PENDING`: admitted, below the threshold. The command must not mint a
    // second operation, and must not consume the key either.
    expect(arrow(fixture.items[2]!, 'ArrowUp')).toBe(true);
    expect(fixture.started).toEqual([]);
    expect(fixture.requests).toEqual([]);
  });

  it('should be refused while a drag is active', async () => {
    const fixture = build();
    const from = grab(fixture, 0);

    press(fixture.items[0]!, from + 10);
    pointerEvent('pointermove', from + 30);
    await nextFrame();

    expect(arrow(fixture.items[2]!, 'ArrowUp')).toBe(true);
    expect(fixture.started).toHaveLength(1);

    pointerEvent('pointerup', from + 30);

    // The press dropped where it started, so it is a proven no-op and no
    // round-trip runs — but it still *finishes*, and it finished as the only
    // operation there was.
    expect(fixture.requests).toEqual([]);
    expect(fixture.finishes).toHaveLength(1);
  });

  it('should be refused while an earlier command is settling', () => {
    let live: Fixture | null = null;
    const fixture = build({
      recordLanding: true,
      onStart(self) {
        live = self;
      },
    });

    arrow(fixture.items[0]!, 'ArrowDown');

    // The recording runner never completes, so the first command is parked at
    // `SETTLING` with its landing gate held.
    expect(live).not.toBeNull();
    expect(fixture.finishes).toEqual([]);
    expect(arrow(fixture.items[2]!, 'ArrowUp')).toBe(true);
    expect(fixture.requests).toHaveLength(1);
  });
});

describe('re-entry from inside command.admit', () => {
  it('should enqueue an invalidate() rather than drain it', () => {
    // I-1: the ingress boundary enqueues without draining, and drains once
    // admission has committed. The replacement therefore lands as a queued
    // action against a committed operation — where `action.prepare(COLLECTION)`
    // rebases the command's gap, or stages a cancel when it cannot survive —
    // instead of mutating the snapshot the open admission is still reading.
    let dispatched = false;
    const fixture = build({
      onAdmit(self) {
        if (!dispatched) {
          dispatched = true;
          // Reversed, so the commanded item is now last and its downward gap
          // cannot survive: the operation is cancelled rather than rebased.
          self.replace([...self.items].reverse());
        }
      },
    });

    arrow(fixture.items[0]!, 'ArrowDown');

    expect(dispatched).toBe(true);
    // The commanded row is last in the reversed collection, so its downward gap
    // cannot survive: the reconciliation stages a cancel rather than carrying a
    // stale gap into release. **Not a classified failure** — that is what this
    // row is really pinning, because a `PENDING` short-circuit that skipped the
    // rebase produced `FAILURE_RELEASE` here instead.
    // The commanded row is last in the reversed collection, so its downward
    // gap cannot survive, and the reconciliation stages a cancel rather than
    // carrying a stale gap into release.
    //
    // **The cancel lands at `PENDING`, so the operation is abandoned with no
    // terminal callback at all** — the phase table's `CANCEL at PENDING →
    // retire` row, which D-32 deliberately kept: no start was notified, so none
    // is owed (I-31). The user pressed an arrow and nothing happened, which is
    // the same observable an edge item already produces.
    //
    // What this row is really pinning is that it is **not a classified
    // failure**. A `PENDING` short-circuit that skipped the rebase carried the
    // stale gap into release and produced `FAILURE_RELEASE` here.
    expect(fixture.started).toEqual([]);
    expect(fixture.cancels).toEqual([]);
    expect(fixture.finishes).toEqual([]);
    expect(fixture.errors).toEqual([]);
    expect(fixture.placeholder()).toBeNull();

    // And the controller is still usable, against the collection it now holds.
    arrow(fixture.items[1]!, 'ArrowDown');

    expect(fixture.requests).toHaveLength(1);
    expect(fixture.errors).toEqual([]);
  });

  it('should refuse a press dispatched from inside the command listener', () => {
    // One shared re-entry latch across both listeners: a nested ingress event is
    // refused before any frame work, whichever direction it comes from. Without
    // it the nested pass would rebuild the draft the outer member is holding by
    // reference and publish an operation with one event's coordinates and the
    // other's behavior state.
    let nested = false;
    const fixture = build({
      onAdmit(self) {
        if (!nested) {
          nested = true;
          press(self.items[2]!, grab(self, 2) + 10);
        }
      },
    });

    arrow(fixture.items[0]!, 'ArrowDown');

    expect(nested).toBe(true);
    // Exactly one operation, and it is the command's.
    expect(fixture.started).toEqual([fixture.items[0]]);
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.requests[0]!.from).toBe(0);
  });

  it('should refuse a command dispatched from inside the press listener', () => {
    let nested = false;
    const fixture = build({
      onAdmit(self) {
        if (!nested) {
          nested = true;
          arrow(self.items[2]!, 'ArrowUp');
        }
      },
    });

    const from = grab(fixture, 0);

    press(fixture.items[0]!, from + 10);
    pointerEvent('pointermove', from + 30);

    expect(nested).toBe(true);
    expect(fixture.started).toEqual([fixture.items[0]]);

    pointerEvent('pointerup', from + 30);

    expect(fixture.finishes).toHaveLength(1);
  });
});
