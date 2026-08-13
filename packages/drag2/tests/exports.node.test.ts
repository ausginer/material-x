import { describe, expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };
import * as drag from '../src/drag.ts';
import * as kernel from '../src/kernel.ts';
import * as callbacks from '../src/sortable/callbacks.ts';
import * as handle from '../src/sortable/handle.ts';
import * as landing from '../src/sortable/landing.ts';
import * as layoutAnimation from '../src/sortable/layout-animation.ts';
import * as placeholder from '../src/sortable/placeholder.ts';
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
  'sortable/callbacks': callbacks,
  'sortable/placeholder': placeholder,
  'sortable/handle': handle,
  'sortable/landing': landing,
  'sortable/layout-animation': layoutAnimation,
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
  // The kernel tier (D-48). Thirteen stages, not fourteen: D-41 deleted
  // `FAILURE_PRESENTATION_READY` with the readiness protocol.
  kernel: [
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
    'draggable',
  ],
  sortable: ['AT_CONSUMER', 'AT_PROPOSAL', 'ReorderResolution', 'sortable'],
  'sortable/y': ['y'],
  'sortable/xy': ['xy'],
  'sortable/callbacks': ['callbacks'],
  'sortable/placeholder': ['placeholder'],
  'sortable/handle': ['handle', 'visual'],
  'sortable/landing': ['landing'],
  'sortable/layout-animation': ['layoutAnimation'],
};

describe('package entrypoints', () => {
  it('should declare the export topology the contract requires', () => {
    // §03 §The export topology this requires. The topology is frozen from
    // phase 0 so the minimal fixture's import graph cannot reach an optional
    // feature, independent of bundler heuristics.
    expect(files.runtime).toEqual(Object.keys(modules));
  });

  it('should resolve every declared entry to a source module', () => {
    for (const entry of files.runtime) {
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
