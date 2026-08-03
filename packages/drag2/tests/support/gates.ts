/**
 * The F-6 test obligation, made executable.
 *
 * Sealing detects a gate hold taken *late*; it cannot detect one never taken at
 * all, so the structural claim in 00 §F-6 was weakened to a test obligation:
 * **any fixture installing `landing()` or supplying `presentationReady` fails
 * loudly if the corresponding hold is never taken.** A silently-missing hold
 * does not throw — it finalizes early, which every ordinary assertion in a
 * composed fixture happily accepts because the final DOM is the same.
 *
 * Two witnesses, one per gate:
 *
 * - **Landing.** A fixture installing `landing()` must see its runner started
 *   at least once per terminal operation. No runner start means no hold.
 * - **Readiness.** A terminal callback delivered while a supplied
 *   `presentationReady` is still pending means the settlement did not wait for
 *   it, which is exactly the early finalization F-6 names.
 *
 * The readiness witness deliberately counts *pending* promises rather than
 * "settled before finish": a destroy or a cancel legitimately terminates an
 * operation with readiness outstanding, and those paths are not F-6 violations.
 * Fixtures that exercise them must not arm this witness.
 */

export type GateWitness = Readonly<{
  /** Call from the landing runner. */
  landingStarted(): void;
  /** Call when a resolution carrying `presentationReady` is handed back. */
  readinessSupplied(): void;
  /** Call when that promise settles. */
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
  let pending = 0;
  let terminals = 0;
  let terminalsWhilePending = 0;

  return {
    landingStarted(): void {
      landingStarts += 1;
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
      if (options.landing && terminals > 0 && landingStarts === 0) {
        throw new Error(
          'F-6: landing() is installed but no runner ever started — the landing gate was never held',
        );
      }

      if (terminalsWhilePending > 0) {
        throw new Error(
          `F-6: ${terminalsWhilePending} terminal callback(s) were delivered while presentationReady was still pending — the readiness gate was never held`,
        );
      }
    },
  };
}
