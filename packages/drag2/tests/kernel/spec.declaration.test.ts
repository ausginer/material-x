/**
 * The two structural halves of the pre-Phase-19 kernel step (D-76): the
 * behavior-selected activation staged type (D-34) and the lift projection
 * (D-35, C5-01).
 *
 * **Both are properties of a type and of nothing else**, which is why they live
 * here rather than beside the runtime rows in `kernel.browser.test.ts`. A
 * behavior that stages nothing had no *value* to return before D-34 — the
 * defect was that the only honest answer was unexpressible, and no runtime
 * assertion can observe an unexpressible answer. Likewise a behavior cannot be
 * caught reading `rendered` or calling `dispose()` at runtime once neither is
 * on the object it holds; the assertion is that they were never handed over.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { Frame } from '../../src/kernel/frames.ts';
import type {
  BehaviorLiftSession,
  VisualLiftSession,
} from '../../src/kernel/presentation.ts';
import type { ActivationScope, BehaviorSpec } from '../../src/kernel/spec.ts';

type ExamplePart = {
  item: HTMLElement | null;
};

/** A behavior that stages nothing — the default, and free drag's shape. */
type StagesNothing = BehaviorSpec<ExamplePart>['activation'];
/** A behavior that stages a resource — the sortable's shape, written out. */
type StagesElement = BehaviorSpec<ExamplePart, HTMLElement>['activation'];

const scope = null as unknown as ActivationScope;
const current = null as unknown as Readonly<Frame<ExamplePart>>;

describe('the activation staged type', () => {
  it('should default to staging nothing', () => {
    // `Transition` has defaulted `Prepared` to `true` since it was written;
    // `BehaviorSpec` was what pinned it to `HTMLElement` (F-44). The default
    // means a behavior that stages nothing writes nothing.
    const stagesNothing: StagesNothing = {
      prepare: () => true,
      effect: () => {},
    };

    expectTypeOf(stagesNothing.prepare).returns.toEqualTypeOf<true | null>();
  });

  it('should hand a staging-nothing effect the sentinel', () => {
    expectTypeOf<
      Parameters<StagesNothing['effect']>[1]
    >().toEqualTypeOf<true>();
  });

  it('should hand a staging-element effect the element', () => {
    // The sortable's staging is unchanged, and its `effect` still receives the
    // placeholder its `prepare` created. D-34 is a widening, not a move.
    expectTypeOf<
      Parameters<StagesElement['effect']>[1]
    >().toEqualTypeOf<HTMLElement>();
  });

  it('should reject an element from a spec that declared it stages nothing', () => {
    const staging: StagesNothing = {
      // @ts-expect-error: `Activation` is `true`, so an element is not stageable
      prepare: (_draft, activation: ActivationScope) => activation.visual,
      effect: () => {},
    };

    void staging;
  });

  it('should reject the sentinel from a spec that declared it stages an element', () => {
    // The parameter narrows in **both** directions, which is what makes it a
    // declaration rather than an escape hatch: a behavior that says it stages a
    // placeholder cannot quietly stop staging one.
    const staging: StagesElement = {
      // @ts-expect-error: `Activation` is `HTMLElement`, so `true` is not it
      prepare: () => true,
      effect: () => {},
    };

    void staging;
  });
});

describe('the lift capability', () => {
  it('should expose the four members a behavior renders through', () => {
    expectTypeOf(scope.lift.visual).toEqualTypeOf<HTMLElement>();
    expectTypeOf(scope.lift.baseTransform).toEqualTypeOf<string>();
    expectTypeOf(scope.lift.compose).toBeFunction();
    expectTypeOf(scope.lift.write).toBeFunction();
  });

  it('should not expose the recorded delta on the activation scope', () => {
    // Kernel-read (D-35). A behavior that could sample it could disagree with
    // the kernel about where the visual is, and has nothing correct to do with
    // the disagreement.
    // @ts-expect-error: `renderedX` is not on `BehaviorLiftSession`
    void scope.lift.renderedX;
    // @ts-expect-error: and neither is `renderedY`
    void scope.lift.renderedY;
  });

  it('should not expose the disposer on the activation scope', () => {
    // **The sequencing hazard, and the reason the projection exists** (C5-01).
    // A behavior calling this from `activation.effect` or `moved` restores the
    // style lease — and, lifted, the top-layer lease — while the recorded delta
    // still describes its last `write`, so the landing samples `from` for a
    // visual that is no longer lifted. That is I-34 broken through a
    // first-class SPI method rather than through a documented residue.
    // @ts-expect-error: `dispose` is not on `BehaviorLiftSession`
    void scope.lift.dispose;
  });

  it('should hand `moved` the same projection and not the session', () => {
    type Moved = BehaviorSpec<ExamplePart>['moved'];

    expectTypeOf<Parameters<Moved>[1]>().toEqualTypeOf<BehaviorLiftSession>();

    const lift = null as unknown as Parameters<Moved>[1];

    // @ts-expect-error: the hot-path argument is projected too
    void lift.renderedX;
    // @ts-expect-error: on both axes
    void lift.renderedY;
    // @ts-expect-error: and so is the disposer
    void lift.dispose;

    void current;
  });

  it('should keep both members on the kernel’s own session', () => {
    // The other half of a positive projection: the members exist, they are just
    // not the behavior's. A `Pick` that silently picked nothing would satisfy
    // every `@ts-expect-error` above and prove nothing.
    const session = null as unknown as VisualLiftSession;

    expectTypeOf(session.renderedX).toEqualTypeOf<number>();
    expectTypeOf(session.renderedY).toEqualTypeOf<number>();
    expectTypeOf(session.dispose).toBeFunction();
  });
});
