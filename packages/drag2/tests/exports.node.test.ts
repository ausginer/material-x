import { describe, expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };
import * as drag from '../src/drag.ts';
import * as callbacks from '../src/sortable/callbacks.ts';
import * as handle from '../src/sortable/handle.ts';
import * as landing from '../src/sortable/landing.ts';
import * as layoutAnimation from '../src/sortable/layout-animation.ts';
import * as placeholder from '../src/sortable/placeholder.ts';
import * as vertical from '../src/sortable/vertical.ts';
import * as sortable from '../src/sortable.ts';

// Statically imported on purpose: this is the scratch consumer fixture for the
// export topology, so each entry has to be named rather than computed.
const modules: Readonly<Record<string, object>> = {
  drag,
  sortable,
  'sortable/vertical': vertical,
  'sortable/callbacks': callbacks,
  'sortable/placeholder': placeholder,
  'sortable/handle': handle,
  'sortable/landing': landing,
  'sortable/layout-animation': layoutAnimation,
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
});
