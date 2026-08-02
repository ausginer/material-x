/**
 * `callbacks()` is the thinnest feature there is, and deliberately so: every
 * decision it could make — the `threshold` default, `onStart` normalization,
 * whether `onReorder` is a function — belongs to the assembler, which is the
 * one place that knows whether a required slot ended up filled.
 *
 * What is left is worth pinning anyway, because "contributes nothing else" is
 * what keeps the single-writer claims meaningful.
 */
import { describe, expect, it } from 'vitest';
import { callbacks } from '../../src/sortable/callbacks.ts';
import {
  type FeatureContext,
  type SortableCallbacks,
  unbrandFeature,
} from '../../src/sortable/feature.ts';

const onReorder: SortableCallbacks['onReorder'] = () => ({ type: 'accepted' });

/** The factory never touches it: the feature is externally inert. */
const context = null as unknown as FeatureContext;

describe('callbacks', () => {
  it('should contribute the consumer options by reference', () => {
    // Not copied: `assemble()` reads each field exactly once at construction,
    // so a copy would only add an allocation and a second thing to keep in sync.
    const options: SortableCallbacks = { onReorder };

    expect(unbrandFeature(callbacks(options))(context).callbacks).toBe(options);
  });

  it('should contribute nothing but the callbacks slot', () => {
    expect(
      Object.keys(unbrandFeature(callbacks({ onReorder }))(context)),
    ).toEqual(['callbacks']);
  });

  it('should not validate its own options', () => {
    // A missing `onReorder` is refused by `assemble()` with a message naming
    // the composition, not here with one naming the feature.
    expect(() => callbacks({} as unknown as SortableCallbacks)).not.toThrow();
  });
});
