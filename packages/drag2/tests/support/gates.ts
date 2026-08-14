/**
 * The F-6 test obligation, made executable.
 *
 * Sealing detects a gate hold taken *late*; it cannot detect one never taken at
 * all, so the structural claim in 00 §F-6 was weakened to a test obligation:
 * **any fixture installing `landing()` or declaring an authored presentation
 * fails loudly if the corresponding hold is never taken.** A silently-missing hold
 * does not throw — it finalizes early, which every ordinary assertion in a
 * composed fixture happily accepts because the final DOM is the same.
 *
 * Two witnesses, one per gate:
 *
 * - **Landing.** A fixture installing `landing()` must see its runner started
 *   at least once per terminal operation. No runner start means no hold —
 *   **unless the library reported a fault**, which since D-49 is the one
 *   sanctioned way a landing does not run: a target that cannot be measured is
 *   skipped, not faked, and the skip always reports through `onError`. That is
 *   why the exemption keys off a reported fault rather than off a flag a test
 *   can set: it is the same signal the consumer gets.
 * - **Readiness.** A terminal callback delivered while a declared authored
 *   presentation is still unacknowledged means the settlement did not wait for
 *   it, which is exactly the early finalization F-6 names.
 *
 * The readiness witness deliberately counts *outstanding declarations* rather
 * than "acknowledged before finish": a destroy or a cancel legitimately
 * terminates an operation with a declaration outstanding, and those paths are
 * not F-6 violations. Fixtures that exercise them must not arm this witness.
 *
 * **This witness is what covers D-33's tier-C residue** (C2-01). A consumer that
 * declares nothing and renders asynchronously anyway is undetectable by the
 * library — the library cannot tell it apart from one that renders
 * synchronously — so the obligation moves here: any fixture that renders
 * asynchronously must declare as well as acknowledge.
 */

export type GateWitness = Readonly<{
  /** Call from the landing runner. */
  landingStarted(): void;
  /**
   * Call from `onError`. Exempts the operation from the landing witness,
   * because a reported fault is the only sanctioned reason a runner never
   * started (D-49).
   */
  faultReported(): void;
  /** Call when a resolution declaring `presentation: true` is handed back. */
  readinessSupplied(): void;
  /** Call when `controller.ready(request)` acknowledges it. */
  readinessSettled(): void;
  /** Call from `onFinish` and `onCancel`. */
  terminal(): void;
  /** Throws if either gate was skipped. Call from `afterEach`. */
  verify(): void;
}>;

export type GateWitnessOptions = Readonly<{
  /** Whether the fixture installs `landing()`. */
  landing: boolean;
}>;

export function createGateWitness(options: GateWitnessOptions): GateWitness {
  let landingStarts = 0;
  let faults = 0;
  let pending = 0;
  let terminals = 0;
  let terminalsWhilePending = 0;

  return {
    landingStarted(): void {
      landingStarts += 1;
    },
    faultReported(): void {
      faults += 1;
    },
    readinessSupplied(): void {
      pending += 1;
    },
    readinessSettled(): void {
      pending -= 1;
    },
    terminal(): void {
      terminals += 1;

      if (pending > 0) {
        terminalsWhilePending += 1;
      }
    },
    verify(): void {
      if (
        options.landing &&
        terminals > 0 &&
        landingStarts === 0 &&
        faults === 0
      ) {
        throw new Error(
          'F-6: landing() is installed but no runner ever started — the landing gate was never held',
        );
      }

      if (terminalsWhilePending > 0) {
        throw new Error(
          `F-6: ${terminalsWhilePending} terminal callback(s) were delivered while a declared authored presentation was still unacknowledged — the readiness gate was never held`,
        );
      }
    },
  };
}
