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
import type { LandingTiming } from '../../src/shared/composition.ts';
import type { PreparedSettlement } from '../../src/kernel/spec.ts';

/**
 * **The settlement scope is retired outright (D-155)**, and the assertions
 * below that named it are vacated by deletion rather than falsified. Every gate
 * this probe reasoned about — the readiness gate D-41 removed and the landing
 * gate D-155 removed — is gone, so the scope that carried them has no member
 * left to declare. What the probe still holds is the shape of its own
 * candidate, kept for the record, and B-2's result, which is now the shipped
 * design rather than a proposal.
 */
type RetiredSettlementScope = Readonly<Record<never, never>>;

declare const scope: RetiredSettlementScope;

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
 * it — the two-independent-gates form that contract 05 carried until D-41
 * retired it.
 */
// **Vacated twice over, and kept rather than rewritten.** D-41 left one gate:
// the readiness hold had no producer under the serial authored commit, so
// P-1's overlap property was already vacated rather than falsified — the
// authored render happened before the landing started, leaving nothing for it
// to overlap with. D-155 then removed the landing gate itself, on the ground
// that an interpolation holding no lease needs no operation. `effect` still
// returns `void` and still awaits nothing, which is the half of P-1 that
// survives both.
// @ts-expect-error — there is no landing gate to hold (D-155).
export const p1: unknown = scope.holdForLanding;

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
// **Stronger than it was.** The assertion was that `holdForReadiness` yields no
// token; D-41 deleted the member outright, so the gate it planned cannot be
// requested at all.
// @ts-expect-error — there is no readiness gate to hold (D-41).
export const n1: object = scope.holdForReadiness;

/**
 * **N-2. There is no request channel.** The scope carried gate holds and
 * nothing else, and carries none now. Nothing lets the kernel say *"I am about to reveal the authored DOM;
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
 * indistinguishable from a slow render until the readiness deadline (both deleted by D-41)
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
 * The candidate scope. Note what changes and what does not: the landing gate is
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
  /** The landing gate as it stood. Retired by D-155. */
  holdForLanding(start: () => void): void;
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
 * It is not an SPI gap, and D-155 has since made it the *only* shape: the
 * timing a landing feature contributes is a function the kernel calls once per
 * landing, at the join, with the trajectory's four coordinates. A consumer
 * reads whatever it likes at exactly the moment the shipped package reads it.
 *
 * The function below compiles against the real `LandingTiming`. That is the
 * proof, and it is now shorter than the probe was.
 */
declare function consumerTiming(): Readonly<{
  duration: number;
  easing: string;
}>;

export const settleTimeTiming: LandingTiming = () =>
  // Read here, not at construction. This line is the whole finding.
  consumerTiming();

/**
 * **What remained of B-2, and where it went.** The capability was reachable but
 * the *ergonomics* were not at parity: a consumer wanting a distance-scaled
 * duration had to reimplement the whole runner, losing the reduced-motion
 * answer with it. That was a public-option question rather than a contract one,
 * and D-67 answered it — `landing({ duration })` takes the trajectory — while
 * D-155 removed the runner the ergonomics gap was measured against.
 */
export type CandidateLandingOptions = Readonly<{
  duration?: number;
  easing?: string;
  /** Read at settle time by the default runner. Wins over `duration`/`easing`. */
  timing?(): Readonly<{ duration: number; easing: string }>;
  run?: (context: unknown) => void;
}>;
