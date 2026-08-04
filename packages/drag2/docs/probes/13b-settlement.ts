/**
 * **Probe 13b — the settlement / authored-presentation protocol.**
 *
 * Write-up: `.agents/docs/drag/probes/13b-settlement.md`.
 *
 * Two cases, and they do **not** get the same verdict:
 *
 * - **B-1 — the authored-presentation protocol.** The SPI expresses it. What it
 *   does badly is *distribute* it: four obligations sit on the consumer, all
 *   silent when violated. This is a protocol-shape problem, so the negative
 *   assertions below are about the *absence of a return channel*, not about
 *   something failing to typecheck at the call site.
 * - **B-2 — settle-time landing timing (ledger L-6).** **It fits.** The probe
 *   proves it by compiling a runner that reads its timing at settle time
 *   against the real, unmodified `LandingStart`. No contract revision is
 *   required, and the ledger row is corrected accordingly.
 *
 * Same rules as 13a: `@ts-expect-error` is the executable half — `tsc` errors on
 * an unused directive — and `R-*` are runtime facts with citations, because
 * typecheck cannot catch a lifecycle error (contract 00).
 */
import type {
  LandingHandle,
  LandingStart,
  PreparedSettlement,
  SettlementScope,
} from '../../src/kernel/spec.ts';

declare const scope: SettlementScope;
declare const authored: PromiseLike<void>;

/* ================================================================= B-1 ==== */

/**
 * **The obligation set.** `presentationReady` requires the consumer to
 *
 * 1. create a promise *before* knowing a render will happen,
 * 2. supersede a previous expectation without dropping it,
 * 3. resolve it from a layout effect, and
 * 4. never lose one.
 *
 * All four are visible in the reference integration's `createCommitTracker`
 * (`src/sortable.stories.tsx:34-56`), and the identical helper is in the
 * shipped package's stories — the burden is **inherited, not a drag2
 * regression**.
 */

/**
 * **P-1. The protocol is expressible, and its best property is structural.**
 * The two gates are separate members and `effect` returns `void`; nothing awaits
 * anything. That is what lets the authored re-render *overlap* the landing
 * animation instead of serializing behind it, and any replacement has to keep
 * it (contract 05 §two independent gates).
 */
export function holdBothGates(start: LandingStart): void {
  scope.holdForReadiness(authored);
  scope.holdForLanding(start);
}

/**
 * **N-1. Holding a gate yields nothing back.** `holdForReadiness` returns
 * `void`, so the kernel cannot hand the consumer a token it could resolve. The
 * promise has to be manufactured on the far side and passed *in* — which is
 * obligation 1, and the root of the other three.
 */
// @ts-expect-error — `holdForReadiness` returns void; there is no token.
export const n1: object = scope.holdForReadiness(authored);

/**
 * **N-2. There is no request channel.** `SettlementScope` has exactly two
 * members. Nothing lets the kernel say *"I am about to reveal the authored DOM;
 * tell me when it exists"*, which is the direction the information naturally
 * flows.
 */
// @ts-expect-error — no such member on the frozen scope.
export const n2: unknown = scope.requestReadiness;

/**
 * **N-3. `PreparedSettlement.ready` has two states where the protocol has
 * three.** `PromiseLike<void> | null` says *wait on this* or *do not wait*. It
 * cannot say *a presentation is expected and has not been promised yet*, which
 * is the state the consumer is actually in when `onReorder` returns — and the
 * state it papers over by constructing a promise it may never resolve.
 */
declare const expectedButUnpromised: Readonly<{ ready: 'expected' }>;

// @ts-expect-error — the third state is not in the type.
export const n3: PreparedSettlement = expectedButUnpromised;

/**
 * **R-1. The only failure signal is a timeout.** A violated obligation is
 * indistinguishable from a slow render until `config.readinessTimeout`
 * elapses, at which point the operation fails with
 * `FAILURE_PRESENTATION_READY`. Pinned executably by the existing suite at
 * `tests/kernel/kernel.browser.test.ts:1793-1800` and `:2102-2114`.
 *
 * **R-2. A hold that is never taken cannot be detected at all.** Sealing catches
 * a hold taken *late*; it cannot catch one never taken. 00 §F-6 was therefore
 * weakened from a structural claim to a **test obligation**, discharged by
 * `tests/support/gates.ts` — a fixture-level witness, not a runtime guarantee. A
 * consumer that silently skips the gate finalizes early and every ordinary
 * assertion passes, because the final DOM is the same.
 *
 * R-1 and R-2 are the case: **the protocol's failure modes are a 500 ms silence
 * and a nothing.**
 */

/* ------------------------------------------------- candidates, not a choice */

/**
 * Sketched so the trade is concrete. **Phase 14 chooses; this file does not.**
 * Each is judged on the two properties that matter: does the authored render
 * still overlap the landing animation, and is a violated obligation visible
 * before the timeout?
 *
 * C-2 is written out because it is the one that inverts *creation*, which is
 * where obligations 1, 2 and 4 come from. Writing it out is not a nomination.
 */

/** A kernel-issued, per-operation readiness token. */
export type ReadinessToken = Readonly<{
  /** The authored presentation now exists. Idempotent; late calls are inert. */
  commit(): void;
  /** No presentation is coming. Settles the gate immediately, with a reason. */
  abandon(reason?: unknown): void;
}>;

/**
 * The candidate scope. Note what changes and what does not: `holdForLanding` is
 * untouched, the two gates stay independent, and `effect` still returns `void`,
 * so the overlap property survives by construction.
 */
export type CandidateSettlementScope = Readonly<{
  /**
   * Declares that an authored presentation is expected and hands back the
   * token that resolves it. The kernel owns the promise, the supersession and
   * the deadline; the consumer owns exactly one call.
   */
  holdForReadiness(): ReadinessToken;
  holdForLanding(start: LandingStart): void;
}>;

declare const candidateScope: CandidateSettlementScope;

/**
 * The consumer side, for comparison with `createCommitTracker`. Obligations 1,
 * 2 and 4 are gone: there is no promise to create, nothing to supersede — a
 * second operation gets a second token — and nothing to lose, because an
 * unresolved token is a thing the *kernel* holds and can name in its failure.
 * Obligation 3 remains: the call still belongs in a layout effect.
 */
export function candidateConsumer(): void {
  const token = candidateScope.holdForReadiness();

  // In React this is the `useLayoutEffect` body; the tracker disappears.
  queueMicrotask(() => {
    token.commit();
  });
}

/* ================================================================= B-2 ==== */

/**
 * **B-2 result: it fits. No contract revision is required.**
 *
 * The shipped `landingTiming()` is read *at settle time*, after the placeholder
 * has returned home (rejected path) or the home target has resolved (free
 * drag). `landing({ duration })` fixes timing at construction, which is what
 * ledger L-6 recorded as a gap.
 *
 * It is not an SPI gap. `LandingStart` is a **public, exported type**, and
 * `landing({ run })` already accepts a full replacement runner
 * (`src/sortable/landing.ts:35`, `:44-46`). The kernel invokes it during
 * *arming*, which happens after `settlement.effect` has returned and after
 * `anchorTarget` — `src/kernel/kernel.ts:1208`, the request → seal → arm order.
 * So a runner reads whatever it likes at exactly the moment the shipped package
 * read it.
 *
 * The function below compiles against the real `LandingStart`. That is the
 * proof.
 */
declare function consumerTiming(): Readonly<{
  duration: number;
  easing: string;
}>;

export const settleTimeRunner: LandingStart = (
  context,
  done,
  fail,
): LandingHandle => {
  // Read here, not at construction. This line is the whole finding.
  const timing = consumerTiming();

  const animation = context.visual.animate(
    [
      { transform: context.compose(context.from.x, context.from.y) },
      { transform: context.compose(context.target.x, context.target.y) },
    ],
    { ...timing, fill: 'forwards' },
  );

  animation.finished.then(() => {
    done();
  }, fail);

  return {
    destroy(): void {
      animation.cancel();
    },
  };
};

/**
 * **What remains of B-2, and where it goes.** The capability is reachable; the
 * *ergonomics* are not at parity. A consumer that only wants a distance-scaled
 * duration must currently reimplement the default runner — losing the
 * reduced-motion collapse, the retarget replay and the generation guard that
 * `landing()` provides (`src/sortable/landing.ts:62-146`).
 *
 * That is a public-option question, not a contract question: `landing()` could
 * accept `duration: number | (() => number)`, or a `timing?: () => AnimationTiming`
 * read inside the default runner. It belongs to Phase 15 or the Phase 22
 * refinement pass, and it must **not** consume a slot in the Phase 14 revision.
 */
export type CandidateLandingOptions = Readonly<{
  duration?: number;
  easing?: string;
  /** Read at settle time by the default runner. Wins over `duration`/`easing`. */
  timing?(): Readonly<{ duration: number; easing: string }>;
  run?: LandingStart;
}>;
