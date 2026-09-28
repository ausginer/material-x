/**
 * **The unwind must be total.**
 *
 * **This module is named for the rule it expresses, not for a destination.**
 * Routing an error to the consumer and letting the caller continue are two
 * separate jobs; only the second one is here, and it is a lifecycle rule rather
 * than a reporting one.
 *
 * The rule at every site is the same sentence: **the statement after this call
 * is load-bearing.** Another resource to release, another teardown step, or the
 * original error to rethrow. Ten of the sites are literal multi-resource
 * releases, three of them `for` loops over installer disposers or an undo
 * ledger. Unwrapped, a throw from step *n* skips steps *n+1* onward — which is
 * exactly how `destroy()` stops being terminal.
 *
 * The catch reports a {@link DraggableWarning} rather than an error, because an
 * unwind step that failed is by construction not consequential — the
 * operation's terminal result, phase sequence and settlement are already
 * decided by the time anything unwinds.
 */
import { DraggableWarning, type Notify } from './errors.ts';

/**
 * Runs one unwind step, absorbing a throw so the next one still runs. Returns
 * `undefined` when the step failed.
 */
export type Unwind = <T>(step: () => T) => T | undefined;

/**
 * Builds the unwind guard over one controller's channel.
 *
 * A closure per kernel rather than a free function taking the notifier: the
 * fourteen call sites read `unwind(fn)` either way, and threading the notifier
 * through each of them would put the channel's identity at every site that
 * merely wants to survive a throw.
 *
 * **The notifier must not throw** — the channel's own guard is what guarantees
 * that, and it is why this function needs no `try` around the report. Every
 * site here is already inside a teardown whose next step matters; a second
 * failure mode in the reporting path would defeat the one property this exists
 * to provide.
 */
export function createUnwind(notify: Notify): Unwind {
  return (step) => {
    try {
      return step();
    } catch (error) {
      // One message for every site, and `cause` carries what was caught. The
      // sites differ in *which* resource failed to release and not in what the
      // consumer can do about it, so a discriminating code would serve nothing.
      notify(
        new DraggableWarning('drag: unwind/step-failed', { cause: error }),
      );
      return undefined;
    }
  };
}
