// oxlint-disable typescript/no-unsafe-type-assertion
/**
 * The tier-A half of the composition model: properties that are compile errors
 * rather than runtime checks (contract 03 §Closed for real, D-30, I-10).
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { Behavior, SettlementScope } from '../../src/kernel/spec.ts';
import type { SortableFeature } from '../../src/sortable/feature.ts';
import type { DisplacementView } from '../../src/sortable/slots.ts';

describe('SortableFeature', () => {
  it('should not accept a structurally matching function literal', () => {
    // The brand is declaration-only and unexported, so third-party authoring is
    // *prevented* rather than discouraged — which is what makes the closed
    // world the rest of the composition model depends on real.
    // @ts-expect-error: the feature value is opaque
    const feature: SortableFeature = () => ({});

    void feature;
  });

  it('should stay nameable and passable', () => {
    // A consumer can hold one and hand it to `sortable()`; it just cannot make
    // one. Losing that would make the type useless rather than opaque.
    const hold = (feature: SortableFeature): SortableFeature => feature;

    expectTypeOf(hold).parameter(0).toEqualTypeOf<SortableFeature>();
  });
});

const held = null as unknown as Behavior<{ destroy(): void }>;

describe('Behavior', () => {
  it('should not accept a bare install function', () => {
    // Same mechanism, same reason: `Behavior` is a function between two
    // internal, unstable SPI types, so it cannot be structurally public.
    // @ts-expect-error: the behavior value is opaque
    const behavior: Behavior<{ destroy(): void }> = () => ({});

    void behavior;
  });

  it('should not be a function type at all', () => {
    // The assignment above is not enough on its own: `Behavior` reverted to the
    // install function type would reject that literal too, on its return type.
    // Not being callable is what actually says "this is not the factory".
    expectTypeOf(held).not.toBeFunction();
  });
});

describe('DisplacementView', () => {
  it('should not reach the settlement scope', () => {
    // I-10: a displacement hook structurally cannot become a lifecycle gate.
    // `SettlementScope` is passed only to `settlement.effect`, so an in-flight
    // displacement can never delay release, settlement or teardown.
    const displacement = null as unknown as DisplacementView;

    // @ts-expect-error: no gate is reachable from a displacement hook
    const scope: SettlementScope = displacement;

    void scope;
  });
});
