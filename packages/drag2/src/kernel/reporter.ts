/**
 * The platform report channel.
 *
 * This is the **non-consequential** half of the failure model. It carries a
 * failing disposer, a duplicate or late gate hold, a throwing `rollback`, a
 * throwing `LandingHandle.destroy()`, and every trajectory-quality failure —
 * anything that must not settle an operation with `OUTCOME_FAILED`
 * (contract 02 §Failure on the quality track, I-29).
 *
 * The consequential half is `host.fail(stage, error)`, which classifies against
 * the operation the kernel currently holds and reaches the consumer's
 * `onError`. The two channels are deliberately separate: destroying a
 * perfectly good drop because one advisory measurement blipped would be wrong.
 */

/**
 * Reports `error` through the platform. Never throws.
 *
 * `reportError` is looked up on `globalThis` per call rather than captured:
 * it is absent outside a browser (Node does not define it), and capturing it
 * once would also make the channel unobservable to a test that installs a stub.
 */
export function report(error: unknown): void {
  try {
    const platform = (globalThis as { reportError?(error: unknown): void })
      .reportError;

    if (platform) {
      platform(error);
      return;
    }

    console.error(error);
  } catch {
    // A reporter that throws must not take the caller down with it. There is
    // nowhere left to escalate to.
  }
}

/**
 * Runs `fn`, routing any throw to {@link report} and returning `undefined`.
 * Used at best-effort boundaries where a throw must not abort the surrounding
 * teardown or seam.
 */
export function guarded<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    report(error);
    return undefined;
  }
}
