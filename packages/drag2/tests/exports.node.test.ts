import { describe, expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };
import * as drag from '../src/drag.ts';
import * as kernel from '../src/kernel.ts';
import * as feature from '../src/sortable/feature.ts';
import * as landing from '../src/sortable/landing.ts';
import * as layoutAnimation from '../src/sortable/layout-animation.ts';
import * as xy from '../src/sortable/xy.ts';
import * as y from '../src/sortable/y.ts';
import * as sortable from '../src/sortable.ts';

// Statically imported on purpose: this is the scratch consumer fixture for the
// export topology, so each entry has to be named rather than computed.
const modules: Readonly<Record<string, object>> = {
  drag,
  kernel,
  sortable,
  'sortable/y': y,
  'sortable/xy': xy,
  'sortable/landing': landing,
  'sortable/layout-animation': layoutAnimation,
  // Last, because the assertion below compares against `runtime` then
  // `typeOnly` and this is the only member of the second list.
  'sortable/feature': feature,
};

/** Code-unit order, so the expected lists below read the way they sort. */
const byName = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

/**
 * The frozen surface from contract 03 §The export topology this requires,
 * asserted against `src` for fast feedback. `consumer.node.test.ts` asserts the
 * same table against the *packed* declarations, which is the one that proves a
 * consumer sees it.
 */
const SURFACE: Readonly<Record<string, readonly string[]>> = {
  // **Shared vocabulary, and one runtime value** (D-64). `DraggableError` is a
  // class, which is what keeps this root alive after D-48 moved `draggable`
  // off it and D-64 moved the stages off with them.
  drag: ['DraggableError'],
  // **The kernel tier, and the whole of D-68's value half — 33 names.** Thirteen
  // stages, not fourteen: D-41 deleted `FAILURE_PRESENTATION_READY` with the
  // readiness protocol. The other nineteen constants are what F-59 found
  // missing: `config.liftMode` needs a `LIFT_*`, `settlement.prepare` needs the
  // `SETTLED_*` arms to discriminate its input, D-66's fallback needs the two
  // `AT_*`, and a behavior reads `frame.phase`. Erased types cannot fill a
  // value position, which is why a type-only assertion could not have seen the
  // hole.
  kernel: [
    'ACTIVATING',
    'ACTIVE',
    'AT_CONSUMER',
    'AT_PROPOSAL',
    'FAILURE_ACTIVATION',
    'FAILURE_ADMISSION',
    'FAILURE_INSERTION',
    'FAILURE_INVALIDATION',
    'FAILURE_LANDING_CREATE',
    'FAILURE_LANDING_INTERRUPTED',
    'FAILURE_LANDING_TARGET',
    'FAILURE_PLACEHOLDER_MOVE',
    'FAILURE_RELEASE',
    'FAILURE_RENDERER_WRITE',
    'FAILURE_REORDER_RESOLUTION',
    'FAILURE_SCHEDULED_FRAME',
    'FAILURE_TERMINAL_CALLBACK',
    'FINALIZING',
    'IDLE',
    'LIFT_FAITHFUL',
    'LIFT_FLAT',
    'LIFT_IN_PLACE',
    'PENDING',
    'RELEASING',
    'REPORTING',
    'SETTLED_CANCELED',
    'SETTLED_FAILED',
    'SETTLED_FULFILLED',
    'SETTLED_REJECTED',
    'SETTLED_SKIPPED',
    'SETTLING',
    'draggable',
    'toDraggableError',
  ],
  sortable: ['AT_CONSUMER', 'AT_PROPOSAL', 'ReorderResolution', 'sortable'],
  // **The middle tier has no runtime exports at all** (D-61). Every name on it
  // is erased. That is the honest measurement statement for this entry: it
  // cannot demonstrate absence because it contains nothing present, and unlike
  // the three subpaths D-56 deleted for exactly that reason, it is not
  // pretending to. It exists to give the authoring types an address.
  'sortable/feature': [],
  'sortable/y': ['y'],
  'sortable/xy': ['xy'],
  'sortable/landing': ['landing'],
  'sortable/layout-animation': ['layoutAnimation'],
};

describe('package entrypoints', () => {
  it('should declare the export topology the contract requires', () => {
    // §03 §The export topology this requires. The topology is frozen from
    // phase 0 so the minimal fixture's import graph cannot reach an optional
    // feature, independent of bundler heuristics.
    // **Two categories, and the split is load-bearing** (D-61). A middle-tier
    // entry with no runtime exports emits no `.js` at all, so declaring it
    // under `runtime` would point the export map's `default` condition at a
    // file the build never writes. `typeOnly` is what says "this address
    // resolves types and nothing else", and the manifest is where that has to
    // be stated — the surface table below cannot tell the two apart, because
    // both look like an empty export list from inside `src`.
    expect([...files.runtime, ...files.typeOnly]).toEqual(Object.keys(modules));
    expect(files.typeOnly).toEqual(['sortable/feature']);
  });

  it('should resolve every declared entry to a source module', () => {
    for (const entry of [...files.runtime, ...files.typeOnly]) {
      expect(modules[entry]).toBeTypeOf('object');
    }
  });

  it('should export exactly the frozen runtime surface', () => {
    // An **equality**, so a new export fails as loudly as a missing one. That
    // is what freezing means: every addition is a deliberate decision against
    // the contract's table, not a side effect of a module gaining a helper.
    const actual: Record<string, readonly string[]> = {};

    for (const [name, module] of Object.entries(modules)) {
      const names: readonly string[] = Object.keys(module);

      actual[name] = names.toSorted(byName);
    }

    expect(actual).toEqual(SURFACE);
  });
});
