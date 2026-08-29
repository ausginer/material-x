/**
 * **The sortable's half of E-02, and the sortable row D-86 is measured
 * against.**
 *
 * Two claims that only make sense together:
 *
 * - the sortable has the *same* lifecycle defect free drag had, through a
 *   different capability. Activation publishes runtime state and calls
 *   `invalidateInSeam()`, which reaches the axis installer's third-party
 *   `invalidateInsertion` and reports only whether it **threw** — never whether
 *   it destroyed the controller. Activation then marked the operation started
 *   and called `onStart`. The review's probe expected zero starts after logical
 *   closure and got one;
 * - and the sortable **intentionally** accepts a collection `invalidate()` in
 *   the phases where free drag's geometry must be frozen. That is why D-86 is a
 *   free-drag rule enforced in free drag's own `action.prepare` and not a phase
 *   filter in the kernel's tag router, and this file is where a router-side fix
 *   would have failed.
 *
 * The two behaviors' barriers have the same *shape* and are deliberately not
 * shared: they guard different calls in different sequences, and E-02's own
 * disposition says having the same shape is not evidence of a common mechanism.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AxisInstaller } from '../../src/sortable/feature.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableController,
} from '../../src/sortable.ts';

const POINTER_ID = 41;
const ITEM_HEIGHT = 40;

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  starts: HTMLElement[];
  errors: unknown[];
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

/**
 * `y()`'s rule with its `invalidate` intercepted. The interceptor is the whole
 * fixture: it is genuine third-party middle-tier code sitting in the one slot
 * activation calls after it has published its runtime and before it notifies.
 */
const interceptingY =
  (onInvalidate: () => void): AxisInstaller =>
  (context): ReturnType<AxisInstaller> => {
    const { insertion } = y()(context);

    return {
      insertion: {
        resolve: insertion.resolve,
        project: insertion.project,
        measure: insertion.measure,
        retire: insertion.retire,
        invalidate(): void {
          onInvalidate();
          insertion.invalidate();
        },
      },
    };
  };

function build(axis: AxisInstaller): Composed {
  const root = document.createElement('div');

  root.style.width = '200px';
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

  const starts: HTMLElement[] = [];
  const errors: unknown[] = [];

  const controller = sortable(root, {
    items: () => items,
    axis,
    onReorder: () => ReorderResolution.accept(),
    onStart: (item): void => {
      starts.push(item);
    },
    onError: (error): void => {
      errors.push(error);
    },
  });

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return { root, items, controller, starts, errors };
}

const pointerEvent = (type: string, clientY: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: 10,
      clientY,
    }),
  );
};

const activate = (composed: Composed): void => {
  composed.items[0]!.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: 10,
    }),
  );
  pointerEvent('pointermove', 30);
};

describe('the final activation barrier', () => {
  it('should publish no start when an insertion invalidator destroys the controller', () => {
    // **E-02, the sortable half.** The helper returns `true` for a call that
    // did not throw, which is a different question from *is the controller
    // still alive* — so without a reading of its own, activation went on to
    // mark the operation started and notify.
    // Declared before the installer so the interceptor can close over it; the
    // installer does not run until `build` constructs the controller.
    const composed: Composed = build(
      interceptingY(() => {
        void composed.controller.destroy();
      }),
    );

    activate(composed);

    expect(composed.starts).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should still publish a start when the invalidator leaves the controller alive', () => {
    // The positive control: the interceptor is installed either way, so the row
    // above cannot pass merely because a wrapped axis never starts.
    const composed = build(interceptingY(() => {}));

    activate(composed);

    expect(composed.starts).toHaveLength(1);
  });
});

describe('a late collection invalidate()', () => {
  it('should still reach the axis rule while the sortable is settling', async () => {
    // **The row a kernel-side fix to E-04 would have broken** (D-86). Free drag
    // refuses a late `invalidate()` because it re-enters declared slots for no
    // observable effect; the sortable accepts one in the same phases because a
    // collection change during settlement is real information. Filtering
    // behavior tags by phase in the router would have made both behaviors obey
    // free drag's rule.
    let invalidations = 0;
    let resolveReorder!: (value: ReorderResolution) => void;

    const root = document.createElement('div');

    root.style.width = '200px';
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

    const controller = sortable(root, {
      items: () => items,
      axis: interceptingY(() => {
        invalidations += 1;
      }),
      onReorder: () =>
        new Promise<ReorderResolution>((resolve) => {
          resolveReorder = resolve;
        }),
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push(() => {
      void controller.destroy();
      root.remove();
    });

    activate({ root, items, controller, starts: [], errors: [] });
    // Past the second row's midpoint, so a real reorder is proposed and the
    // resolver is actually invoked — a no-op drop settles without one, and the
    // fixture would then be asserting against an idle controller.
    pointerEvent('pointermove', 75);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
    pointerEvent('pointerup', 75);
    await Promise.resolve();

    const settledInvalidations = invalidations;

    // The resolver is still pending, so the operation is settling — the phase
    // free drag freezes and this behavior does not.
    controller.invalidate();

    expect(invalidations).toBe(settledInvalidations + 1);

    resolveReorder(ReorderResolution.accept());
    await Promise.resolve();
  });
});
