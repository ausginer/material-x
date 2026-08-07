/**
 * The numeric domains of every public option, checked where they are declared.
 *
 * All four are validated at **construction**, with the offending call still on
 * the stack — the same rule `copyUniqueItems` follows for a duplicate item. The
 * types say `number`, but a JavaScript consumer is not bound by that, and the
 * silent failures are nasty: a `NaN` threshold activates on nothing, a `NaN`
 * duration produces an animation that never finishes, and a `0` readiness
 * timeout fails every gate before the promise can settle.
 */
import { describe, expect, it } from 'vitest';
import { assemble } from '../../src/sortable/assemble.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import { ReorderResolution } from '../../src/sortable/domain.ts';
import type {
  FeatureContext,
  SortableFeature,
} from '../../src/sortable/feature.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { y } from '../../src/sortable/y.ts';

const context: FeatureContext = {
  realm: null as never,
  root: null as never,
  report: (): void => {},
};

/** Assembling is what applies the defaults, so it is what validates them. */
const assembleWith = (options: Record<string, unknown>): unknown =>
  assemble(
    [
      y(),
      callbacks({
        onReorder: () => ReorderResolution.accept(),
        ...options,
      }),
    ] satisfies readonly SortableFeature[],
    context,
  );

describe('threshold', () => {
  it('should default to 8 CSS pixels', () => {
    expect(assembleWith({})).toMatchObject({ threshold: 8 });
  });

  it('should accept zero, meaning the first move that reports a new point', () => {
    expect(assembleWith({ threshold: 0 })).toMatchObject({ threshold: 0 });
  });

  it('should refuse a negative distance', () => {
    expect(() => assembleWith({ threshold: -1 })).toThrow(
      /threshold must be a finite number >= 0/u,
    );
  });

  it('should refuse a non-finite distance', () => {
    expect(() => assembleWith({ threshold: Number.NaN })).toThrow(/threshold/u);
    expect(() => assembleWith({ threshold: Number.POSITIVE_INFINITY })).toThrow(
      /threshold/u,
    );
  });

  it('should refuse a value that is not a number at all', () => {
    expect(() => assembleWith({ threshold: '8' })).toThrow(/threshold/u);
  });
});

describe('readinessTimeout', () => {
  it('should default to 500 milliseconds', () => {
    expect(assembleWith({})).toMatchObject({ readinessTimeout: 500 });
  });

  it('should accept a longer bound for a round-tripping consumer', () => {
    expect(assembleWith({ readinessTimeout: 30_000 })).toMatchObject({
      readinessTimeout: 30_000,
    });
  });

  it('should refuse zero, which would fail every gate it bounds', () => {
    expect(() => assembleWith({ readinessTimeout: 0 })).toThrow(
      /readinessTimeout must be a finite number >= 1/u,
    );
  });

  it('should refuse a non-finite bound', () => {
    // Not even `Infinity` as "never time out": the bound exists so a gate
    // cannot hold presentation forever, and an unbounded one is the state it
    // was introduced to prevent.
    expect(() =>
      assembleWith({ readinessTimeout: Number.POSITIVE_INFINITY }),
    ).toThrow(/readinessTimeout/u);
  });
});

describe('landing duration', () => {
  it('should default to 200 milliseconds', () => {
    expect(() => landing()).not.toThrow();
  });

  it('should accept zero, which still holds the gate through the runner', () => {
    expect(() => landing({ duration: 0 })).not.toThrow();
  });

  it('should refuse a negative duration', () => {
    expect(() => landing({ duration: -1 })).toThrow(
      /landing\(\{ duration \}\) must be a finite number >= 0/u,
    );
  });

  it('should refuse a non-finite duration', () => {
    expect(() => landing({ duration: Number.NaN })).toThrow(/landing/u);
  });

  it('should not validate easing, which only the platform can parse', () => {
    expect(() => landing({ easing: 'not-an-easing' })).not.toThrow();
  });

  it('should not call a duration thunk at construction', () => {
    // 13b B-2: a thunk is read at **settle time**, which is the moment the
    // shipped package's `landingTiming()` was read. Calling it here would put it
    // back at construction and lose the whole point.
    let reads = 0;

    landing({
      duration: () => {
        reads += 1;
        return 200;
      },
    });

    expect(reads).toBe(0);
  });

  it('should not range-check a duration thunk at construction', () => {
    // The value does not exist yet, so there is nothing to check. A thunk that
    // returns a bad value throws from inside `start`, where the kernel already
    // classifies `FAILURE_LANDING_CREATE`.
    expect(() => landing({ duration: () => -1 })).not.toThrow();
  });

  it('should not validate the duration of a full replacement runner', () => {
    // `run` replaces the default runner entirely, so the option it would have
    // configured has no meaning left to check.
    expect(() =>
      landing({ duration: -1, run: () => ({ destroy: (): void => {} }) }),
    ).not.toThrow();
  });
});

describe('layoutAnimation duration', () => {
  it('should default to 160 milliseconds', () => {
    expect(() => layoutAnimation()).not.toThrow();
  });

  it('should accept zero', () => {
    expect(() => layoutAnimation({ duration: 0 })).not.toThrow();
  });

  it('should refuse a negative duration', () => {
    expect(() => layoutAnimation({ duration: -1 })).toThrow(
      /layoutAnimation\(\{ duration \}\) must be a finite number >= 0/u,
    );
  });

  it('should refuse a non-finite duration', () => {
    expect(() => layoutAnimation({ duration: Number.NaN })).toThrow(
      /layoutAnimation/u,
    );
  });
});
