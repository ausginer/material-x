/**
 * Reporting and narrow failure-policy helpers.
 *
 * There is no universal safe-effect boundary: different failures have different
 * policies, and the chosen policy stays visible at each call site. These helpers
 * only remove repetition around the two universal rules — errors are reported
 * exactly once, and a failing reporter falls through to the platform
 * `reportError` rather than masking the original failure.
 */

/**
 * Reports `error` through the consumer `onError`, falling through to the
 * platform `reportError` if `onError` itself throws or is absent. Never throws.
 */
export function reportError_(
  error: unknown,
  onError: ((error: unknown) => void) | undefined,
): void {
  if (onError) {
    try {
      onError(error);
      return;
    } catch (callbackError) {
      reportError(callbackError);
      return;
    }
  }

  reportError(error);
}

/**
 * Runs `fn`, routing any thrown error through {@link reportError_} and returning
 * `undefined`. Used for best-effort callback invocation at effect boundaries
 * where a throw must not abort surrounding teardown.
 */
export function guarded<T>(
  fn: () => T,
  onError: ((error: unknown) => void) | undefined,
): T | undefined {
  try {
    return fn();
  } catch (error) {
    reportError_(error, onError);
    return undefined;
  }
}
