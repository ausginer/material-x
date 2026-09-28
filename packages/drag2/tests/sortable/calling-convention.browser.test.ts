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
 * **What the sortable's lift actually does today — measured code, not the
 * guarantee** (D-94, members restated by D-157). The assembler lifts four
 * members off the contributed geometry and they are reached at **five** sites,
 * which do not agree on the receiver: `resolve`, `invalidate` and `moved`
 * become fields on the behavior's flat slot record and are called as
 * `slots.resolveInsertion(…)`, so their receiver is that **slot record**; the
 * normal `retire` is handed to `unwind` as a bare value out of `retireHooks`,
 * so its receiver is `undefined`; and the **construction-unwind** `retire` is
 * reached by `retireHooks[i]!()`, an indexed call that hands the hook the
 * assembler's internal **array**.
 *
 * **The displacement sink is lifted the same way and is asserted here too.**
 * `report` and `settle` become `slots.report` and `slots.settle`, so a
 * `this`-reading sink breaks against the same convention an axis does; one
 * tier stating the obligation for its geometry and staying silent about its
 * other installer group would reintroduce exactly the distinction D-92 refused
 * to let the package suggest.
 *
 * The rows below therefore assert **the receiver is never the nested
 * capability record the member is declared on** (D-93, referent corrected by
 * D-94), which is the invariant the convention promises and the one a
 * `this`-reading author breaks against. For an axis the referent is the nested
 * `InsertionGeometry` and not the outer contribution: a fully bound
 * `contribution.insertion.resolve(…)` never uses the contribution object
 * either, so rows written against it would pass on the tree the convention
 * forbids. Asserting `undefined` uniformly would fail the conforming tree at
 * four of the five axis sites, and would pin the flattening's current shape
 * rather than the obligation.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { Insertion } from '../../src/sortable/domain.ts';
import type {
  AxisInstaller,
  DisplacementContribution,
  DisplacementReport,
  InsertionFrameView,
  InsertionGeometry,
  InsertionRuntimeView,
  SortableDisplacementInstaller,
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
  /**
   * The **nested `InsertionGeometry`** — the capability record the members are
   * declared on, and the receiver that must never appear (D-94). Deliberately
   * not the outer contribution the installer returns, which a bound tree would
   * not use either.
   */
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
      moved(
        this: unknown,
        frame: InsertionFrameView,
        runtime: InsertionRuntimeView,
        report: DisplacementReport | null,
      ): void {
        receivers.push(['moved', this]);
        inner.moved(frame, runtime, report);
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

type DisplacementRecording = Readonly<{
  displacement: SortableDisplacementInstaller;
  receivers: ReadonlyArray<readonly [string, unknown]>;
  /**
   * The **`DisplacementContribution`** the two members are declared on. Here
   * the contribution *is* the capability record — the sink contributes no
   * nested one — so unlike the axis's there is no outer object to mistake it
   * for.
   */
  own(): DisplacementContribution | null;
}>;

/**
 * A sink that does nothing but record, which is all this suite needs: the
 * convention is about the receiver each member is handed, and starting real
 * animations would only add a source of flake to a row that never reads one.
 *
 * `function` shorthand for the same reason `recordingAxis` uses it — an arrow
 * would report the module's `this` from a bound site and a lifted one alike.
 */
function recordingDisplacement(): DisplacementRecording {
  const receivers: Array<readonly [string, unknown]> = [];
  let own: DisplacementContribution | null = null;

  const displacement: SortableDisplacementInstaller = () => {
    const contribution: DisplacementContribution = {
      report(this: unknown): void {
        receivers.push(['report', this]);
      },
      settle(this: unknown): void {
        receivers.push(['settle', this]);
      },
    };

    own = contribution;

    return contribution;
  };

  return { displacement, receivers, own: () => own };
}

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  errors: unknown[];
}>;

function composeWith(
  axis: AxisInstaller,
  displacement?: SortableDisplacementInstaller,
): Composed {
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
    // Spread rather than written as `displacement`, so a composition that names
    // no sink stays the minimal one the other rows drive rather than one
    // carrying an explicitly `undefined` key.
    ...(displacement ? { displacement } : {}),
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
function expectDetached(
  recording: Readonly<{
    receivers: ReadonlyArray<readonly [string, unknown]>;
    own(): object | null;
  }>,
  site: string,
): void {
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

  it('should hand the moved site a foreign receiver', async () => {
    // Reached only inside the committed-move bracket — immediately after the
    // one DOM write — which is why this row has to commit a reorder rather than
    // merely activate.
    const recording = recordingAxis(y());
    const composed = composeWith(recording.axis);

    await reorder(composed);

    expectDetached(recording, 'moved');
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
    // developing. `displacement` is the last key the assembler visits and the
    // axis is the first, so the axis's hook is already registered when the
    // throw arrives.
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

    const boom: SortableDisplacementInstaller = () => {
      throw new Error('installer');
    };

    expect(() =>
      sortable(root, {
        items: () => [item],
        onReorder: () => ReorderResolution.accept(),
        axis: recording.axis,
        displacement: boom,
      }),
    ).toThrow();
    root.remove();

    expectDetached(recording, 'retire');
  });

  it('should never hand any site the geometry record', async () => {
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

describe('a lifted displacement sink', () => {
  it('should hand the report site a foreign receiver', async () => {
    // `report` is reached at one instant — inside the committed-move bracket,
    // after the DOM write — so this row has to commit a reorder. **Its caller
    // is the axis**, which was handed the member as an argument; what the row
    // asserts is that passing it through a call does not bind it to the
    // contribution it was declared on.
    const recording = recordingDisplacement();
    const composed = composeWith(y(), recording.displacement);

    await reorder(composed);

    expectDetached(recording, 'report');
  });

  it('should hand the settle site a foreign receiver', async () => {
    // Reached from inside an axis rebuild that runs while a contribution is in
    // flight, which is what lets a rebuild see settled geometry without
    // anything being released first — a different call site with a different
    // caller from `report`.
    const recording = recordingDisplacement();
    const composed = composeWith(xy(), recording.displacement);

    await reorder(composed);
    pointer('pointerup', 110, document);
    await settled();

    expectDetached(recording, 'settle');
  });

  it('should never hand either site the contribution record', async () => {
    // The sink's aggregate, standing to the two rows above as
    // *should never hand any site the geometry record* stands to the axis's
    // four: re-binding both lifts must not leave this suite green.
    const recording = recordingDisplacement();
    const composed = composeWith(y(), recording.displacement);

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
