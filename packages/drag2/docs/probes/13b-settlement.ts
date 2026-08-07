/**
 * **Probe 13b — the settlement / authored-presentation protocol.**
 *
 * Write-up: `.plan/probes/13b-settlement.md`.
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
 *
 * ## Retimed in Phase 15, not rewritten
 *
 * This probe imports the live SPI, and Phase 15 implemented D-33 underneath it.
 * The **finding is unchanged** — it is what produced D-33 — so nothing here is
 * softened; what moved is the shape each assertion is written against, and every
 * such site says which side of the revision it is describing. B-1's four
 * obligations are the pre-revision `presentationReady` protocol and are recorded
 * as history; the assertions that survive the revision (N-1, N-2) survive it
 * because they were about the *absence of a return channel*, which D-33 also
 * declines to add.
 */
import type {
  LandingHandle,
  LandingStart,
  PreparedSettlement,
  SettlementScope,
} from '../../src/kernel/spec.ts';

declare const scope: SettlementScope;

/* ================================================================= B-1 ==== */

/**
 * **The obligation set.** `presentationReady` requires the consumer to
 *
 * 1. create a promise *before* knowing a render will happen,
 * 2. supersede a previous expectation without dropping it,
 * 3. resolve it from a layout effect, and
 * 4. never lose one.
 *
 * All four were visible in the reference integration's `createCommitTracker`,
 * and the identical helper was in the shipped package's stories — the burden was
 * **inherited, not a drag2 regression**.
 *
 * **Closed by D-33, implemented in Phase 15.** Obligations 1, 2 and 4 are gone:
 * there is nothing to create, a stale acknowledgement is rejected and reported
 * rather than silently applied, and a *declared* presentation that is never
 * acknowledged is bounded and nameable. Obligation 3 survives and is
 * irreducible — only the consumer knows when its own commit landed. The helper
 * this row cited no longer exists in either the story or the React fixture,
 * which is the observable form of the finding being closed.
 */

/**
 * **P-1. The protocol is expressible, and its best property is structural.**
 * The two gates are separate members and `effect` returns `void`; nothing awaits
 * anything. That is what lets the authored re-render *overlap* the landing
 * animation instead of serializing behind it, and any replacement has to keep
 * it (contract 05 §two independent gates).
 */
export function holdBothGates(start: LandingStart): void {
  // Post-revision this takes no argument, and the property P-1 names is
  // untouched by that: `effect` still returns `void` and the two holds are still
  // separate members, so the overlap is still structural.
  scope.holdForReadiness();
  scope.holdForLanding(start);
}

/**
 * **N-1. Holding a gate yields nothing back.** `holdForReadiness` returns
 * `void`, so the kernel cannot hand the consumer a token it could resolve. Under
 * the pre-revision protocol that was the defect's root: the promise had to be
 * manufactured on the far side and passed *in*, which is obligation 1.
 *
 * The assertion **still holds after D-33, and now deliberately**. C-2 would have
 * made this line compile by minting a token here; Checkpoint C found that a
 * capability minted by the settlement is younger than the render it
 * acknowledges. C-3 keeps the gate yielding nothing and keys the
 * acknowledgement on the request instead, so no settlement machinery crosses the
 * public boundary at all.
 */
// @ts-expect-error — `holdForReadiness` returns void; there is no token.
export const n1: object = scope.holdForReadiness();

/**
 * **N-2. There is no request channel.** `SettlementScope` has exactly two
 * members. Nothing lets the kernel say *"I am about to reveal the authored DOM;
 * tell me when it exists"*, which is the direction the information naturally
 * flows.
 */
// @ts-expect-error — no such member on the frozen scope.
export const n2: unknown = scope.requestReadiness;

/**
 * **N-3. `PreparedSettlement.ready` had two states where the protocol has
 * three.** `PromiseLike<void> | null` said *wait on this* or *do not wait*. It
 * could not say *a presentation is expected and has not been promised yet*,
 * which is the state the consumer is actually in when `onReorder` returns — and
 * the state it papered over by constructing a promise it might never resolve.
 *
 * **This is the row D-33 answered most directly**: the third state is now the
 * *only* state the type carries. `presentation: boolean` says exactly "a
 * presentation is expected", and the promise it replaced is not expressible —
 * which is what the assertion below now pins, from the other side.
 */
declare const expectedButUnpromised: Readonly<{ ready: 'expected' }>;

// @ts-expect-error — the gate plan is a declaration, not a wait.
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
