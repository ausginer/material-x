/**
 * The F-6 test obligation, made executable.
 *
 * Sealing detects a gate hold taken *late*; it cannot detect one never taken at
 * all, so the structural claim in 00 §F-6 was weakened to a test obligation:
 * **any fixture installing `landing()` fails loudly if the hold is never
 * taken.** A silently-missing hold does not throw — it finalizes early, which
 * every ordinary assertion in a composed fixture happily accepts because the
 * final DOM is the same.
 *
 * Two witnesses, and **only the first is a library gate since D-41**:
 *
 * - **Landing.** A fixture installing `landing()` must see its runner started
 *   at least once per terminal operation. No runner start means no hold —
 *   **unless the library reported a fault**, which since D-49 is the one
 *   sanctioned way a landing does not run: a target that cannot be measured is
 *   skipped, not faked, and the skip always reports through `onError`. That is
 *   why the exemption keys off a reported fault rather than off a flag a test
 *   can set: it is the same signal the consumer gets.
 * - **The consumer's own commit.** A terminal delivered while the fixture's
 *   authored commit is still outstanding means the settlement did not wait for
 *   it — the same early finalization F-6 names, one owner further out.
 *
 * **The second witness used to be the readiness gate, and it outlived it.**
 * D-41 deleted `accept({ presentation: true })`, `controller.ready(request)`
 * and the acknowledgement deadline, so there is no library-side declaration to
 * be outstanding any more. What replaced it is the serial authored commit: the
 * consumer awaits its own barrier *inside* `onReorder`, and the resolution
 * returning is the signal. The witness therefore now brackets the fixture's own
 * promise — opened when the resolver defers, closed when the commit lands — and
 * a terminal in between still means the operation finalized over an unrendered
 * DOM. It is kept rather than deleted because that failure is still possible
 * and still invisible to every other assertion; only its *owner* moved, from
 * the library to the consumer, which is exactly what D-41 traded for.
 *
 * The commit witness deliberately counts *outstanding* brackets rather than
 * "closed before finish": a destroy or a cancel legitimately terminates an
 * operation with one open, and those paths are not F-6 violations. Fixtures
 * that exercise them must not arm this witness.
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
  /** Call when the resolver defers on the fixture's own commit barrier. */
  commitOpened(): void;
  /** Call when that commit has landed. */
  commitClosed(): void;
  /** Call from `onEnd` — one terminal since D-62, whichever arm it carries. */
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
    commitOpened(): void {
      pending += 1;
    },
    commitClosed(): void {
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
          `F-6: ${terminalsWhilePending} terminal callback(s) were delivered while the fixture's own authored commit was still outstanding — the settlement did not wait for it`,
        );
      }
    },
  };
}
