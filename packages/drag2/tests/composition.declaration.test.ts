/**
 * **Cross-behavior installers do not compile** — D-87, closing E-06.
 *
 * The two middle tiers publish behavior-specific installer aliases because
 * their contribution records differ. TypeScript did not agree: every real slot
 * on both records is optional, so the records were mutually assignable and a
 * strict probe compiled all three of these with exit code 0.
 *
 * The consequence was not academic. Free drag's public `plugins` slot accepted
 * an `AxisInstaller`, and free drag's assembler reads `constrain`,
 * `startLanding` and `retire` — so the `insertion` the installer contributed
 * was **silently discarded**. A supported middle-tier API took a value and did
 * nothing with it.
 *
 * **The rule is key-set totality** (D-88, superseding D-87's mechanism): both
 * records declare the same seven keys, and a key a behavior does not implement
 * it declares `?: never`. Free drag implements three and excludes four; the
 * sortable implements six and excludes one. **The boundary is asymmetric
 * because the slot sets are**, and D-87's _one exclusion per direction_
 * described a symmetry that does not exist — it closed `insertion` and
 * `constrain` and left `placeholder` and both displacement hooks open.
 *
 * **This file previously could not see that, and the reason is the load-bearing
 * part** (CE1-01). Every row below the first group starts from a `declare const`
 * of an installer **alias**, which is exactly the form the two exclusions
 * already caught. What escaped was the **unannotated** form D-78 says an
 * ordinary author writes — and what refused most of them was not the exclusions
 * at all but TypeScript's *weak-type* detection, which an all-optional target
 * gets for free and which `retire`, the one member both records genuinely
 * share, defeats. So the escaped-form group drives real hoisted literals
 * through `freeDrag`'s public `plugins` slot, and **every one of them carries
 * `retire`**: without it the row would pass for a mechanism other than the one
 * under test.
 *
 * The key-set equality assertion is what turns D-87's future-work promise into
 * a check: a slot added to either record without its twin fails here at the
 * moment it is added, rather than being owed to a reviewer.
 *
 * `@ts-expect-error` is the assertion. It fails the typecheck if the line ever
 * *starts* compiling, which is the direction that matters here.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  FreeDragContribution,
  FreeDragInstaller,
  LandingStart,
  FeatureContext as FreeDragFeatureContext,
} from '../src/free-drag/feature.ts';
import { FreeDragResolution, freeDrag } from '../src/free-drag.ts';
import type {
  AxisInstaller,
  PlaceholderSlot,
  SortableContribution,
  SortableInstaller,
  FeatureContext as SortableFeatureContext,
} from '../src/sortable/feature.ts';

declare const axisInstaller: AxisInstaller;
declare const sortableInstaller: SortableInstaller;
declare const freeDragInstaller: FreeDragInstaller;

describe('an axis installer', () => {
  it('should not be assignable to a free-drag installer', () => {
    // **The strongest falsifier E-06 names**, and the one reachable through a
    // supported public API: `freeDrag(item, config, { plugins: [y()] })`. The
    // sortable `insertion` contribution is *required* here, so this is also the
    // case a per-body exclusion would have missed — assignability is decided on
    // the declared alias.
    // @ts-expect-error — D-87: a free-drag contribution has no insertion.
    const free: FreeDragInstaller = axisInstaller;

    void free;
  });
});

describe('a sortable installer', () => {
  it('should not be assignable to a free-drag installer', () => {
    // @ts-expect-error — D-87, the optional-`insertion` half of the same rule.
    const free: FreeDragInstaller = sortableInstaller;

    void free;
  });
});

describe('a free-drag installer', () => {
  it('should not be assignable to a sortable installer', () => {
    // **The reverse direction, which is why there are two exclusions and not
    // one.** Without `SortableContribution.constrain?: never` a motion
    // constraint would reach the sortable's assembler, which has no slot for it
    // and would erase it exactly as free drag erased `insertion`.
    // @ts-expect-error — D-87: a sortable contribution has no constraint.
    const sortable: SortableInstaller = freeDragInstaller;

    void sortable;
  });

  it('should not be assignable to an axis installer', () => {
    // @ts-expect-error — D-87, and the missing required `insertion` besides.
    const axis: AxisInstaller = freeDragInstaller;

    void axis;
  });
});

describe('an empty installer', () => {
  it('should stay assignable to both behaviors', () => {
    // **The row that keeps the boundary honest.** An empty contribution is
    // genuinely valid for either behavior, so refusing it would be a boundary
    // drawn for its own sake — and it is what a brand or a phantom discriminant
    // would have refused. Without this row the exclusions could be widened into
    // a general separation without anything noticing.
    const free: FreeDragInstaller = () => ({});
    const sortable: SortableInstaller = () => ({});

    void free;
    void sortable;
  });
});

describe('the two contributions', () => {
  it('should declare the same key set', () => {
    // **D-88's whole mechanism, and the only form that cannot drift.** D-87
    // wrote the twin rule as future work while it was already owed for three
    // existing slots; this fails at the moment a slot is added to either record
    // without its `?: never` twin on the other, which is a check rather than a
    // promise. It says nothing about which behavior *implements* a key — that
    // is the per-record row below, and the asymmetry is the point.
    expectTypeOf<keyof FreeDragContribution>().toEqualTypeOf<
      keyof SortableContribution
    >();
  });

  it('should exclude the other behavior capabilities by name', () => {
    // Asserted as types rather than through the installer aliases, so the
    // mechanism is visible: free drag excludes four of the seven and the
    // sortable one, and each name is the defining capability of the other
    // behavior rather than an arbitrary marker.
    expectTypeOf<
      FreeDragContribution['insertion']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['placeholder']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['beforeInsertionMove']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['afterInsertionMove']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      SortableContribution['constrain']
    >().toEqualTypeOf<undefined>();
  });
});

describe('an unannotated installer', () => {
  // The three sortable-only slots, each written the way a hoisted literal
  // actually reaches the public API — no alias, no annotation, inferred.
  //
  // `retire` is on every one of them **deliberately** and is not decoration: it
  // is the member both records share, so it satisfies TypeScript's weak-type
  // check and leaves the assignment to be decided by the exclusions alone.
  // Drop it and each row compiles for a reason that has nothing to do with
  // D-88, which is precisely how CE1-01 stayed invisible.
  const item = document.createElement('div');
  const config = { onDrop: () => FreeDragResolution.accept() };
  const dispose = (): void => {};
  const slot: PlaceholderSlot = () => document.createElement('div');

  it('should not reach free drag plugins carrying a placeholder', () => {
    const placeholderPlugin = () => ({ placeholder: slot, retire: dispose });

    void freeDrag(item, config, {
      // @ts-expect-error — D-88: a free-drag contribution has no placeholder.
      plugins: [placeholderPlugin],
    }).destroy();
  });

  it('should not reach free drag plugins carrying a beforeInsertionMove hook', () => {
    const beforePlugin = () => ({
      beforeInsertionMove: (): void => {},
      retire: dispose,
    });

    void freeDrag(item, config, {
      // @ts-expect-error — D-88: free drag has no displacement pipeline.
      plugins: [beforePlugin],
    }).destroy();
  });

  it('should not reach free drag plugins carrying an afterInsertionMove hook', () => {
    const afterPlugin = () => ({
      afterInsertionMove: (): void => {},
      retire: dispose,
    });

    void freeDrag(item, config, {
      // @ts-expect-error — D-88: free drag has no displacement pipeline.
      plugins: [afterPlugin],
    }).destroy();
  });

  it('should still reach free drag plugins carrying only shared slots', () => {
    // **The positive control**, and the one that keeps the exclusions from
    // being read as a general separation: `startLanding` and `retire` are
    // legitimately shared, so an unannotated installer contributing them is
    // valid free-drag middle-tier code and must stay so.
    const sharedPlugin = () => ({
      startLanding: ((_context, done) => {
        done();
        return { destroy: dispose };
      }) satisfies LandingStart,
      retire: dispose,
    });
    const controller = freeDrag(item, config, { plugins: [sharedPlugin] });

    expect(controller).toBeTypeOf('object');

    void controller.destroy();
  });
});

describe('FeatureContext', () => {
  it('should stay one declaration across the two middle tiers', () => {
    // **What D-87 deliberately does not touch** (F-64, B-7). The incompatibility
    // is in what an installer **produces**, never in what it is handed — so the
    // shared context stays one type, and a fix that separated the tiers wholesale
    // would fail here.
    expectTypeOf<FreeDragFeatureContext>().toEqualTypeOf<SortableFeatureContext>();
  });
});
