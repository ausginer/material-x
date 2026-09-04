/**
 * **The behavior-facing narrowing, asserted as a difference rather than as a
 * handful of absences.**
 *
 * The kernel class implements {@link BehaviorContext} directly, so the object a
 * behavior holds is the kernel itself under a narrower type. Nothing at runtime
 * withholds anything: the projection is a property of two type declarations and
 * of nothing else, which is why it is asserted here.
 *
 * **A member the interface never named is not evidence.** An
 * `@ts-expect-error` on `kernel.addIngress` is satisfied by a name that exists
 * on neither declaration, so it reports the narrowing while measuring the
 * spelling — it would keep passing if the interface widened to the whole class.
 * The rows below are stated over the two key sets instead, so a member added to
 * the class and a member added to the interface each fail one of them by
 * construction, and neither can be added silently.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { Kernel } from '../../src/kernel/kernel.ts';
import type { BehaviorContext } from '../../src/kernel/spec.ts';

type ExamplePart = {
  item: HTMLElement | null;
};

/** The wide type, which only `draggable()` ever holds. */
type WideKernel = Kernel<ExamplePart>;

/** What the class publishes and the interface does not. */
type Withheld = Exclude<keyof WideKernel, keyof BehaviorContext>;

describe('the behavior-facing context', () => {
  it('should grant exactly the seven members it names', () => {
    // Positively selected, so this is an equality in both directions: a member
    // dropped from the interface fails it as loudly as one added.
    expectTypeOf<keyof BehaviorContext>().toEqualTypeOf<
      'realm' | 'root' | 'dispatch' | 'fail' | 'closed' | 'cancel' | 'destroy'
    >();
  });

  it('should withhold every public member of the class it does not name', () => {
    // **The discriminating row.** `arm` is the whole of the difference today,
    // and stating it as a difference is what makes the assertion about the
    // narrowing rather than about one member's name: a public member added to
    // the class lands in `Withheld` and fails here until it is classified, and
    // one promoted onto the interface leaves `Withheld` and fails here too.
    expectTypeOf<Withheld>().toEqualTypeOf<'arm'>();
  });

  it('should keep the arming handshake on the class', () => {
    // The other half of a positive projection: the member exists, it is just
    // not the behavior's. The direct read a behavior would have to write —
    // `void kernel.arm` under `@ts-expect-error` — is asserted against the
    // **shipped** declarations in `tests/consumer.node.test.ts`, so what is
    // owed here is that the member the difference names is really there.
    expectTypeOf<WideKernel['arm']>().toBeFunction();
  });
});
