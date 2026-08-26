import { describe, expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };
import * as drag from '../src/drag.ts';
import * as freeDragBounds from '../src/free-drag/bounds.ts';
import * as freeDragFeature from '../src/free-drag/feature.ts';
import * as freeDragLanding from '../src/free-drag/landing.ts';
import * as freeDrag from '../src/free-drag.ts';
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
  'sortable/feature': feature,
  'sortable/y': y,
  'sortable/xy': xy,
  'sortable/landing': landing,
  'sortable/layout-animation': layoutAnimation,
  'free-drag': freeDrag,
  'free-drag/bounds': freeDragBounds,
  'free-drag/landing': freeDragLanding,
  // Last, because the assertion below compares against `runtime` then
  // `typeOnly`, and this one is the whole of the second list.
  'free-drag/feature': freeDragFeature,
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
  // **The stage vocabulary joins the two classes** (D-132 §6).
  // `DraggableError.stage` is a `FailureStage`, so D-68 puts the type at this
  // root; and a numeric union whose members are unnameable is not a public
  // type, so the twelve constants follow it as runtime exports. One
  // declaration in `kernel/failures.ts`, published from here *and* from
  // `kernel.js` — the same pattern `AT_PROPOSAL`/`AT_CONSUMER` already run
  // between `kernel.js` and `sortable.js`.
  drag: [
    'DraggableError',
    'DraggableWarning',
    'FAILURE_ACTION_EFFECT',
    'FAILURE_ACTION_PREPARE',
    'FAILURE_ACTIVATION',
    'FAILURE_ADMISSION',
    'FAILURE_INVALIDATION',
    'FAILURE_LANDING_CREATE',
    'FAILURE_LANDING_INTERRUPTED',
    'FAILURE_RELEASE',
    'FAILURE_RENDERER_WRITE',
    'FAILURE_RESOLUTION',
    'FAILURE_SCHEDULED_FRAME',
    'FAILURE_TERMINAL_CALLBACK',
  ],
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
    'FAILURE_ACTION_EFFECT',
    'FAILURE_ACTION_PREPARE',
    'FAILURE_ACTIVATION',
    'FAILURE_ADMISSION',
    'FAILURE_INVALIDATION',
    'FAILURE_LANDING_CREATE',
    'FAILURE_LANDING_INTERRUPTED',
    'FAILURE_RELEASE',
    'FAILURE_RENDERER_WRITE',
    'FAILURE_RESOLUTION',
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
  ],
  sortable: ['AT_CONSUMER', 'AT_PROPOSAL', 'ReorderResolution', 'sortable'],
  // The second behavior's ordinary tier, and the symmetry is the assertion:
  // one function, one resolution namespace, and the two cancel stages a
  // `CanceledFreeDragResult` obliges the consumer to discriminate (D-68).
  'free-drag': ['AT_CONSUMER', 'AT_PROPOSAL', 'FreeDragResolution', 'freeDrag'],
  'free-drag/bounds': ['bounds'],
  'free-drag/landing': ['landing'],
  // **One runtime export, and it is what made this a runtime entry** (D-123,
  // D-125). ~~The middle tier has no runtime exports at all.~~ Every other
  // name here is still erased; `insertionAt` is the construction rule for the
  // value the tier's only *producing* slot returns, so an axis author needs it
  // to satisfy a term the package publishes and does not implement for them.
  // This row is also the whole of the emitted-module claim: an entry with no
  // runtime export emits no `.js`, which is why `files.json` had to move it
  // out of `typeOnly` in the same change.
  'sortable/feature': ['insertionAt'],
  // **Free drag's middle tier still has none, and the asymmetry is the
  // measurement.** `FreeDragInstaller`, `FreeDragContribution`,
  // `MotionConstraint`, `ConstraintView` and `MotionDraft` are all erased, so
  // this entry emits no `.js` at all — which is what `typeOnly` says and what
  // keeps the split above load-bearing rather than vestigial.
  'free-drag/feature': [],
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
    expect(files.typeOnly).toEqual(['free-drag/feature']);
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
