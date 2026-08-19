/**
 * **The sortable half of the detached calling convention** (D-92).
 *
 * D-90 stated the convention on `MotionConstraint` and pinned free drag's three
 * members at five sites. It chose detached over bound on the grounds that
 * binding one tier would leave *two conventions in one package* — an argument
 * that only pays off if **both** tiers state it, and one statement beside one
 * silence is worse than two silences, because a reader who meets
 * `MotionConstraint`'s sentence and then `InsertionGeometry`'s silence has
 * positive evidence of a distinction the package does not make.
 *
 * **What the sortable's lift actually does, measured rather than assumed.** The
 * assembler lifts four members off the returned record and they are reached at
 * **five** sites, which do not agree on the receiver: `resolve` and `invalidate`
 * become fields on the behavior's flat slot record and are called as
 * `slots.resolveInsertion(…)`, so their receiver is that **slot record**;
 * `measure` is read into a local and the normal `retire` is iterated out of
 * `retireHooks`, so theirs is `undefined`; and the **construction-unwind**
 * `retire` is reached by `retireHooks[i]!()`, an indexed call that hands the
 * hook the assembler's internal **array**.
 *
 * The rows below therefore assert **the receiver is never the record the
 * installer returned** (D-93), which is the invariant the convention promises
 * and the one a `this`-reading author breaks against. Asserting `undefined`
 * uniformly would fail the conforming tree at three of the five sites, and
 * would pin the flattening's current shape rather than the obligation.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { Insertion } from '../../src/sortable/domain.ts';
import type {
  AxisInstaller,
  InsertionFrameView,
  InsertionGeometry,
  InsertionRuntimeView,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  sortable,
  type SortableController,
} from '../../src/sortable.ts';

const POINTER_ID = 21;
const ITEM_HEIGHT = 40;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

type Recording = Readonly<{
  axis: AxisInstaller;
  receivers: ReadonlyArray<readonly [string, unknown]>;
  /** The record the installer handed back — the receiver that must never appear. */
  own(): InsertionGeometry | null;
}>;

/**
 * Wraps a real axis rule so the geometry still resolves and the drag still
 * behaves, while every member records the receiver it was handed.
 *
 * The members are `function` shorthand rather than arrows precisely so that
 * they *have* a receiver to observe: an arrow captures the module's `this` and
 * would report the same value from a bound site as from a lifted one, which is
 * the fixture defect that let D-90 sit green through three passes.
 */
function recordingAxis(base: AxisInstaller): Recording {
  const receivers: Array<readonly [string, unknown]> = [];
  let own: InsertionGeometry | null = null;

  const axis: AxisInstaller = (context) => {
    const contribution = base(context);
    const inner = contribution.insertion;
    const insertion: InsertionGeometry = {
      resolve(
        this: unknown,
        frame: InsertionFrameView,
        runtime: InsertionRuntimeView,
      ): Insertion | null {
        receivers.push(['resolve', this]);

        return inner.resolve(frame, runtime);
      },
      invalidate(this: unknown): void {
        receivers.push(['invalidate', this]);
        inner.invalidate();
      },
      measure(
        this: unknown,
        frame: InsertionFrameView,
        runtime: InsertionRuntimeView,
      ): void {
        receivers.push(['measure', this]);
        inner.measure?.(frame, runtime);
      },
      retire(this: unknown): void {
        receivers.push(['retire', this]);
        inner.retire();
      },
    };

    own = insertion;

    return { ...contribution, insertion };
  };

  return { axis, receivers, own: () => own };
}

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  errors: unknown[];
}>;

function composeWith(axis: AxisInstaller): Composed {
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

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  const errors: unknown[] = [];
  const controller = sortable(root, {
    items: () => items,
    onReorder: () => ReorderResolution.accept(),
    axis,
    onError: (error): void => {
      errors.push(error);
    },
  });

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return { root, items, controller, errors };
}

const pointer = (type: string, y: number, target: EventTarget): void => {
  target.dispatchEvent(
    new PointerEvent(type, {
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

const frame = async (): Promise<void> => {
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve(null);
    });
  });
};

const settled = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

/** Activates the drag on the first item without committing a move. */
const activate = (composed: Composed): void => {
  pointer('pointerdown', 10, composed.items[0]!);
  pointer('pointermove', 60, document);
};

/** Carries the pointer far enough to commit a placeholder move. */
const reorder = async (composed: Composed): Promise<void> => {
  activate(composed);
  await frame();
  pointer('pointermove', 110, document);
  await frame();
  await frame();
};

/**
 * Every site is asserted **reached** before its receiver is asserted foreign.
 * Without the first half a row passes when its site is never driven, which is
 * the other way a convention test measures nothing.
 */
function expectDetached(recording: Recording, site: string): void {
  const seen = recording.receivers
    .filter(([name]) => name === site)
    .map(([, receiver]) => receiver);

  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((receiver) => receiver === recording.own())).toEqual([]);
}

describe('a lifted insertion geometry', () => {
  it('should hand the resolve site a foreign receiver', async () => {
    // Each row drives one site and reads only that member's receivers, so a
    // single re-bound lift in `assemble` fails a single row. Re-binding all
    // four members — the maximally non-conforming tree D-92 forbids — fails
    // every row below.
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    await reorder(composed);

    expectDetached(recording, 'resolve');
  });

  it('should hand the invalidate site a foreign receiver', () => {
    // The gesture's scroll/resize listener, driven with no commit so the
    // receivers read here belong to it rather than to the move bracket.
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    activate(composed);
    window.dispatchEvent(new Event('resize'));

    expectDetached(recording, 'invalidate');
  });

  it('should hand the optional measure site a foreign receiver', async () => {
    // `measure` is the one optional member, reached only inside the committed
    // -move bracket once the placeholder has been written — which is why this
    // row has to commit a reorder rather than merely activate.
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    await reorder(composed);

    expectDetached(recording, 'measure');
  });

  it('should hand the retire site a foreign receiver', async () => {
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    await reorder(composed);
    pointer('pointerup', 110, document);
    await settled();
    await composed.controller.destroy();

    expectDetached(recording, 'retire');
  });

  it('should hand the construction unwind a foreign receiver', () => {
    // **The fifth site** (D-93). `retire` is reached from the normal
    // retirement *and* from the assembler's unwind, which runs when a later
    // installer throws — the path a third-party author hits most often while
    // developing. The axis installs before `plugins`, so its hook is already
    // registered when the throw arrives.
    //
    // It is also the site that decides the assertion's form: `retireHooks[i]!()`
    // is an indexed call, so the hook is handed the assembler's internal array
    // rather than `undefined`. The obligation holds; a claim naming the
    // receiver would not.
    const recording = recordingAxis(y());
    const root = document.createElement('div');
    const item = document.createElement('div');

    root.append(item);
    document.body.append(root);

    const boom: SortableInstaller = () => {
      throw new Error('installer');
    };

    expect(() =>
      sortable(root, {
        items: () => [item],
        onReorder: () => ReorderResolution.accept(),
        axis: recording.axis,
        plugins: [boom],
      }),
    ).toThrow();
    root.remove();

    expectDetached(recording, 'retire');
  });

  it('should never hand any site the installer record', async () => {
    // The aggregate the falsifier is stated against: **all four** lifts
    // re-bound must not leave the suite green, and this row is the one that
    // fails on any one of them without naming which.
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    await reorder(composed);
    pointer('pointerup', 110, document);
    await settled();
    await composed.controller.destroy();

    expect(
      recording.receivers
        .filter(([, receiver]) => receiver === recording.own())
        .map(([name]) => name),
    ).toEqual([]);
    expect(composed.errors).toEqual([]);
  });
});

describe('the first-party axis rules', () => {
  it('should leave y() working through the same lifted sites', async () => {
    // **Recorded as a non-discriminating control, not as evidence** (F-74).
    // `y()` closes over its rect index, so it passes whether the sites are
    // lifted or bound — which is exactly why the rows above had to be written
    // with a fixture that reads its receiver.
    const composed = composeWith(y());

    await reorder(composed);
    pointer('pointerup', 110, document);
    await settled();

    expect(composed.errors).toEqual([]);
  });

  it('should leave xy() working through the same lifted sites', async () => {
    // The second control, for the same reason and with the same standing.
    const composed = composeWith(xy());

    await reorder(composed);
    pointer('pointerup', 110, document);
    await settled();

    expect(composed.errors).toEqual([]);
  });
});
