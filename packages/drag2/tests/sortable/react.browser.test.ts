/**
 * The React fixture the matrix asks for by name (05 §Test matrix, Readiness:
 * *readiness resolved from a real `useLayoutEffect()` fixture*), plus the three
 * authored-commit rows Phase 10 owes.
 *
 * Everything else in `tests/sortable` resolves readiness from a promise the
 * test itself holds a resolver for, which proves the *gate* works but proves
 * nothing about the assumption the gate exists for: that a framework's commit
 * lands **after** the consumer answered `onReorder`, on its own schedule, and
 * that the settlement is still waiting when it does. Here the resolver lives
 * inside a real `useLayoutEffect`, so the ordering is React's, not the test's.
 *
 * The authored commit is the other half. A framework applying a reorder does
 * not politely restrict itself to the elements the library is tracking — it
 * inserts headers above the placeholder, mounts newly keyed rows into the gap
 * the drag opened, and (I-25 notwithstanding) sometimes unmounts the dragged
 * item outright. Those are the three remaining rows, and the last is **Q-12**.
 *
 * Composition: `sortable(root, { items, onReorder, … }, y(), { landing: … })`.
 * The runner is supplied — through a **middle-tier installer**, since D-63
 * withdrew `landing({ run })` — rather than defaulted, so the landing gate is
 * directly observable to the F-6 witness — the default runner is covered by
 * `landing-space.browser.test.ts` and `features.browser.test.ts`.
 *
 * Layout: the list is absolutely positioned at the viewport origin with 40px
 * rows, so destination centres are 20, 60 and 100 and every coordinate below is
 * exact rather than approximate.
 */
import {
  createElement,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DraggableError, Point } from '../../src/drag.ts';
import type { LandingStart } from '../../src/sortable/feature.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type ReorderRequest,
  type SortableController,
  type ReorderTransactionResult,
  sortable,
} from '../../src/sortable.ts';
import { createGateWitness, type GateWitness } from '../support/gates.ts';

const POINTER_ID = 21;
const ROW_HEIGHT = 40;

type Row = Readonly<{ id: string }>;

type Commit = Readonly<{ rows: readonly Row[]; banner: boolean }>;

/** What `onReorder` does to the authored state, given the request. */
type Author = (
  commit: Commit,
  request: ReorderRequest,
  ids: string[],
) => Commit;

type Options = Readonly<{
  ids?: readonly string[];
  author?: Author;
  /** Omitted means the fixture declares no authored presentation at all. */
  ready?: boolean;
  /** Apply the authored commit on a later task instead of inline. */
  defer?: boolean;
  /**
   * Park unmounted rows in a detached pool instead of dropping them, the way a
   * virtualizer recycles nodes. This is the Q-12 shape with teeth: the dragged
   * item is disconnected *and still has a parent*, so an unguarded re-anchor
   * really does drag the placeholder out of the document.
   */
  recycle?: boolean;
  /**
   * Keep that pool **in** the document, which is what a consumer moving a row
   * to a second list does. The item is then connected but under a different
   * parent, which is the only shape that tells the two guard conjuncts apart.
   */
  poolInDocument?: boolean;
}>;

type Fixture = Readonly<{
  list: HTMLElement;
  controller: SortableController;
  requests: ReorderRequest[];
  finishes: ReorderTransactionResult[];
  cancels: ReorderTransactionResult[];
  errors: DraggableError[];
  /** One entry per React commit, each the DOM order at that commit. */
  commits: string[];
  /** The provisional landing target handed to each runner start. */
  landingTargets: Point[];
  /** The detached recycle pool, when `recycle` is on. */
  pool: HTMLElement;
  /** Every node ever inserted into that pool, in order. */
  poolAdditions(): Node[];
  row(id: string): HTMLElement;
  /** DOM order: row ids, `_` for the placeholder, `B` for the banner. */
  order(): string;
  /** Resolves on the next React commit. */
  nextCommit(): Promise<void>;
}>;

const cleanup: Array<() => void> = [];

let witness: GateWitness;

beforeEach(() => {
  witness = createGateWitness({ landing: true });
});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }

  witness.verify();
});

function mount(options: Options = {}): Fixture {
  const host = document.createElement('div');

  document.body.append(host);

  const ids = [...(options.ids ?? ['a', 'b', 'c'])];
  const elements = new Map<string, HTMLElement>();
  /** Every element ever mounted, including ones React has since removed. */
  const known = new Map<string, HTMLElement>();
  /** Stands in for a virtualizer's recycle pool: never in the document. */
  const recycler = document.createElement('div');
  // The only way to see an unguarded re-anchor: the placeholder is moved into
  // the pool and then removed from it again by finalization, so the pool's
  // *final* contents look identical either way. Its mutation history does not.
  const poolAdditions: Node[] = [];
  const poolObserver = new MutationObserver((records) => {
    for (const record of records) {
      poolAdditions.push(...record.addedNodes);
    }
  });

  poolObserver.observe(recycler, { childList: true });

  if (options.poolInDocument === true) {
    recycler.className = 'pool';
    document.body.append(recycler);
  }
  const commits: string[] = [];
  const commitWaiters: Array<() => void> = [];
  /** The request this fixture still owes an acknowledgement for. */
  let pending: ReorderRequest | null = null;
  const landingTargets: Point[] = [];

  const root = createRoot(host);

  let list!: HTMLElement;
  let state: Commit = { rows: ids.map((id) => ({ id })), banner: false };
  let publish!: (next: Commit) => void;
  // Declared before the commit hook, which runs once before it is assigned.
  let controller: SortableController | undefined;

  const orderOf = (): string =>
    list === undefined
      ? ''
      : [...list.children]
          .map((child) => {
            for (const [id, element] of elements) {
              if (element === child) {
                return id;
              }
            }

            return child.classList.contains('banner') ? 'B' : '_';
          })
          .join('');

  // The single authored commit hook: publishes the collection the drag must now
  // see, records the order, and releases whatever is waiting on this commit.
  // Runs inside `useLayoutEffect`, which is the whole point — it is the earliest
  // moment the committed DOM is measurable, and it is where a real consumer
  // resolves `presentationReady`.
  const committed = (): void => {
    commits.push(orderOf());

    // The live collection is no longer assembled here: D-44 makes it a pull
    // source, so `items()` maps `ids` through `elements` at the moment the
    // library asks. A row the author unmounted is gone from `elements` and
    // therefore from the collection — which is what makes the Q-12 case
    // reachable at all, unchanged.

    if (options.recycle === true) {
      // Done here rather than in the ref cleanup: React detaches refs *before*
      // it removes the host nodes, so moving the node from the ref callback
      // would make React's own `removeChild` throw.
      for (const [id, element] of known) {
        if (!elements.has(id)) {
          recycler.append(element);
        }
      }
    }

    // Undefined on the mount commit, which is the commit that produces the
    // elements the controller is about to be armed against.
    // D-44: the mount commit publishes nothing; it signals. `items()` maps
    // `ids` through `elements`, so the library pulls the live collection
    // itself and sees a new array identity.
    controller?.invalidate();

    // **No acknowledgement** (D-41). The layout effect that used to answer the
    // readiness gate has nothing to answer: under the serial authored commit a
    // consumer that must render first awaits its own commit barrier inside
    // `onReorder`, so by the time the resolution returns this effect has
    // already run.
    if (pending !== null) {
      pending = null;
      witness.commitClosed();
    }

    for (const waiter of commitWaiters.splice(0)) {
      waiter();
    }
  };

  const App = (): ReactNode => {
    const [current, setCurrent] = useState(state);

    useLayoutEffect(() => {
      publish = setCurrent;
    }, []);
    useLayoutEffect(committed);

    return createElement(
      'div',
      {
        className: 'list',
        ref: (element: HTMLElement | null): void => {
          if (element !== null) {
            list = element;
          }
        },
      },
      current.banner
        ? createElement('div', { key: 'banner', className: 'banner' })
        : null,
      ...current.rows.map(({ id }) =>
        createElement(
          'div',
          {
            key: id,
            className: 'row',
            ref: (element: HTMLElement | null): void => {
              if (element === null) {
                elements.delete(id);
              } else {
                elements.set(id, element);
                known.set(id, element);
              }
            },
          },
          id,
        ),
      ),
    );
  };

  const style = document.createElement('style');

  style.textContent = `
    .list { position: absolute; inset: 0 auto auto 0; width: 200px; }
    .pool { position: absolute; inset: 400px auto auto 0; width: 200px; }
    .row { display: block; width: 100px; height: ${ROW_HEIGHT}px; }
    .banner { display: block; width: 100px; height: ${ROW_HEIGHT}px; }
  `;
  document.head.append(style);

  const requests: ReorderRequest[] = [];
  const finishes: ReorderTransactionResult[] = [];
  const cancels: ReorderTransactionResult[] = [];
  const errors: DraggableError[] = [];

  const run: LandingStart = (context, done): { destroy(): void } => {
    witness.landingStarted();
    // The provisional target is the only public view of what `anchorTarget`
    // measured, and it is what makes the Q-12 fallback observable at all.
    landingTargets.push(context.target);

    const frame = requestAnimationFrame(() => {
      done();
    });

    return {
      destroy(): void {
        cancelAnimationFrame(frame);
      },
    };
  };

  const { author } = options;

  // `flushSync` for the **initial** mount only: the controller cannot be armed
  // against elements that do not exist yet, and `render()` is concurrent. Every
  // later commit is scheduled by React and awaited, which is the timing under
  // test.
  flushSync(() => {
    root.render(createElement(App));
  });

  controller = sortable(
    list,
    {
      items: () => ids.map((id) => elements.get(id)!),
      axis: y(),
      onReorder: (
        request,
      ): ReorderResolution | PromiseLike<ReorderResolution> => {
        requests.push(request);

        if (author !== undefined) {
          const apply = (): void => {
            state = author(state, request, ids);
            publish(state);
          };

          // `onReorder` is answered inside the `pointerup` handler, so a
          // state update made here lands on React's discrete lane and
          // commits before the event returns. `defer` is the other real
          // shape — a consumer that persists the order first — and it is
          // the one that actually proves the settlement waits.
          if (options.defer === true) {
            setTimeout(apply, 0);
          } else {
            apply();
          }
        }

        if (options.ready !== true) {
          return ReorderResolution.accept();
        }

        witness.commitOpened();
        // **The whole integration, and D-41 is what makes it this short.**
        // React's commit lands after this event handler returns, so a
        // consumer whose render must be on screen before the drop lands
        // `await`s its own commit barrier here. The resolution does not
        // return until the authored DOM is final — which is why the library
        // needs no acknowledgement, no declaration and no deadline.
        pending = request;

        return new Promise<void>((resolve) => {
          commitWaiters.push(resolve);
        }).then(() => ReorderResolution.accept());
      },
      onEnd(result): void {
        witness.terminal();

        // D-62: one terminal, and the witness counts it once whichever arm it
        // carries — which is what makes the F-6 gate check independent of the
        // outcome.
        if (result.type === 'accepted' || result.type === 'noop') {
          finishes.push(result);
        } else {
          cancels.push(result);
        }
      },
      onError(error): void {
        // D-49: a reported fault is what exempts the operation from the landing
        // witness, because a skipped landing starts no runner.
        witness.faultReported();
        errors.push(error);
      },
    },
    // D-63: authored at the middle tier, which is where a runner lives now.
    { landing: () => ({ startLanding: run }) },
  );

  // Synthetic pointer events have no active pointer, so the real
  // `setPointerCapture` would throw `NotFoundError` for every activation.
  list.setPointerCapture = (): void => {};
  list.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    poolObserver.disconnect();
    recycler.remove();
    void controller.destroy();
    root.unmount();
    host.remove();
    style.remove();
  });

  return {
    list,
    get controller(): SortableController {
      return controller;
    },
    requests,
    finishes,
    cancels,
    errors,
    commits,
    landingTargets,
    pool: recycler,
    poolAdditions: () => {
      for (const record of poolObserver.takeRecords()) {
        poolAdditions.push(...record.addedNodes);
      }

      return poolAdditions;
    },
    row: (id) => elements.get(id)!,
    order: orderOf,
    nextCommit: () =>
      new Promise<void>((resolve) => {
        commitWaiters.push(resolve);
      }),
  };
}

const press = (target: HTMLElement, y: number): void => {
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

/** Press a row and cross the activation threshold. */
const activate = (fixture: Fixture, index: number): void => {
  press(fixture.row(fixture.order()[index]!), index * ROW_HEIGHT + 10);
  pointerEvent('pointermove', index * ROW_HEIGHT + 30);
};

/** Move the pointer and let the coalesced spatial frame resolve it. */
const drag = async (y: number): Promise<void> => {
  pointerEvent('pointermove', y);
  await nextFrame();
};

const release = (y: number): void => {
  pointerEvent('pointerup', y);
};

/** Drain the microtask queue plus the landing runner's frame. */
const settle = async (): Promise<void> => {
  await nextFrame();
  await nextFrame();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Move the row at `from` into `to`, the way a consumer applies a request. */
const reordered = (rows: readonly Row[], from: number, to: number): Row[] => {
  const next = [...rows];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved!);

  return next;
};

describe('a React consumer', () => {
  it('should resolve readiness from a real layout effect', async () => {
    const fixture = mount({
      ready: true,
      author: (commit, request) => ({
        ...commit,
        rows: reordered(commit.rows, request.from, request.to),
      }),
    });

    activate(fixture, 0);
    await drag(55);
    release(55);
    await settle();

    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.order()).toBe('bac');
  });

  it('should not finalize before React has committed', async () => {
    // The gate's whole reason to exist: the consumer said "accepted" in a
    // microtask, but the DOM it promised does not exist yet.
    const fixture = mount({
      ready: true,
      defer: true,
      author: (commit, request) => ({
        ...commit,
        rows: reordered(commit.rows, request.from, request.to),
      }),
    });

    activate(fixture, 0);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fixture.commits).toHaveLength(1);
    expect(fixture.finishes).toEqual([]);

    await fixture.nextCommit();
    await settle();

    expect(fixture.finishes).toHaveLength(1);
  });

  it('should keep the placeholder in place until the commit lands', async () => {
    // Removing the placeholder before the authored rows exist is the visible
    // form of finalizing early: the list collapses by one row and springs back.
    const fixture = mount({
      ready: true,
      defer: true,
      author: (commit, request) => ({
        ...commit,
        rows: reordered(commit.rows, request.from, request.to),
      }),
    });

    activate(fixture, 0);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    expect(fixture.order()).toContain('_');
  });

  it('should accept a commit that inserts content above the placeholder', async () => {
    // The authored commit adds a banner ahead of every row, so every measured
    // box shifts by one row height between the proposal and the pin.
    const fixture = mount({
      ready: true,
      author: (commit, request) => ({
        banner: true,
        rows: reordered(commit.rows, request.from, request.to),
      }),
    });

    activate(fixture, 0);
    await drag(55);
    release(55);
    await settle();

    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.order()).toBe('Bbac');
  });

  it('should accept a commit that mounts a new keyed row into the gap', async () => {
    // A newly keyed element in the destination gap is an element the operation
    // has never seen. It arrives with the collection replacement the layout
    // effect dispatches, after the proposal was frozen.
    const fixture = mount({
      ready: true,
      author: (commit, request) => {
        const rows = reordered(commit.rows, request.from, request.to);

        rows.splice(request.to, 0, { id: 'new' });

        return { ...commit, rows };
      },
    });

    activate(fixture, 0);
    await drag(55);
    release(55);
    await settle();

    expect(fixture.errors).toEqual([]);
    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.order()).toBe('bnewac');
  });

  describe('that unmounts the dragged item (D-42, ex-Q-12)', () => {
    /**
     * **This suite changed verdict at Phase R, and the verdict is the point.**
     *
     * Q-12 judged this case "degraded, not stranded": the item is gone, so the
     * re-anchor is skipped and the still-connected placeholder is measured
     * where it stands. D-42 supersedes that. The precondition asks whether the
     * measurement is *meaningful* — placeholder connected, and still in the
     * item's container — and an unmounted item fails the second conjunct, so
     * the landing is skipped instead of measured.
     *
     * What did not change is the half that mattered: the drop still completes,
     * the placeholder still leaves, and the controller is still usable. What
     * changed is that the consumer is now **told**, which is the whole of
     * probe C1's finding — the worst integration bug in the package and also
     * its most silent.
     */
    const unmounting: Options = {
      ready: true,
      author: (commit, request, ids) => ({
        ...commit,
        rows: commit.rows.filter(({ id }) => id !== ids[request.from]),
      }),
    };

    it('should finish and report, both', async () => {
      // **The orthogonality case with a real consumer** (D-60). The reorder was
      // accepted and is real; the landing target is not measurable. Those are
      // two answers to two questions and the operation gives both.
      const fixture = mount(unmounting);

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      expect(fixture.finishes).toHaveLength(1);
      expect(fixture.errors).toHaveLength(1);
      expect(fixture.errors[0]!.code).toBe('presentation');
    });

    it('should leave no placeholder behind', async () => {
      const fixture = mount(unmounting);

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      expect(fixture.order()).toBe('bc');
    });

    it('should skip the landing rather than measure a stale target', async () => {
      // The discriminating shape, and it now discriminates the other way. A row
      // parked in a recycle pool is disconnected **with** a parent, which is
      // what an unguarded `item.before(placeholder)` would follow. The re-anchor
      // guard still refuses that; the precondition then refuses the measurement
      // itself, so no target is produced and no runner is started — a jump cut
      // rather than a confident animation toward a rect the library does not
      // trust.
      const fixture = mount({ ...unmounting, recycle: true });

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      expect(fixture.landingTargets).toEqual([]);
      expect(fixture.finishes).toHaveLength(1);
    });

    it('should never move the placeholder into the recycle pool', async () => {
      // The re-anchor guard's own job, unchanged by D-42 and asserted ahead of
      // it: the guard runs first, and only a placeholder the guard left alone
      // reaches the precondition at all.
      const fixture = mount({ ...unmounting, recycle: true });

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      expect(fixture.poolAdditions()).toEqual([fixture.pool.firstElementChild]);
      expect(fixture.pool.children).toHaveLength(1);
    });

    it('should not re-anchor into a container the consumer moved the row to', async () => {
      // Same shape, one difference: the pool is in the document, so the row is
      // *connected* under a different parent. This is the case that makes the
      // parentage conjunct load-bearing on its own — a consumer moving a row to
      // a second list, where re-anchoring would insert the placeholder into a
      // list this operation never owned.
      const fixture = mount({
        ...unmounting,
        recycle: true,
        poolInDocument: true,
      });

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      expect(fixture.poolAdditions()).toEqual([fixture.pool.firstElementChild]);
    });

    it('should leave the controller usable for the next drag', async () => {
      // "Reported, not stranded" is only true if the *controller* survives, and
      // that is the half of Q-12's answer D-42 keeps.
      const fixture = mount(unmounting);

      activate(fixture, 0);
      await drag(55);
      release(55);
      await settle();

      activate(fixture, 0);

      expect(fixture.order()).toContain('_');
    });
  });
});
