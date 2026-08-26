/**
 * **The unwind must be total** (D-29, I-19, I-6, D-130 §4).
 *
 * ~~`reporter.ts`, the platform report channel.~~ **Renamed for the rule it
 * expresses, 2026-08-26.** The old module owned two jobs — route an error
 * somewhere, and let the caller continue — and D-130 separates them: routing is
 * the one consumer channel now, and what survives here is the second job, which
 * is a real lifecycle rule and not a reporting one.
 *
 * The rule at every site is the same sentence: **the statement after this call
 * is load-bearing.** Another resource to release, another teardown step, or the
 * original error to rethrow. Ten of the sites are literal multi-resource
 * releases, three of them `for` loops over installer disposers or an undo
 * ledger. Unwrapped, a throw from step *n* skips steps *n+1* onward — which is
 * exactly how `destroy()` stops being terminal.
 *
 * It takes the notifier rather than owning a destination, which is the whole of
 * what changed: the catch reports a {@link DraggableWarning}, because an unwind
 * step that failed is by construction not consequential — the operation's
 * terminal result, phase sequence and settlement are already decided by the
 * time anything unwinds.
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
      // consumer can do about it, which is exactly the case D-130 §2.3 says a
      // code would not serve.
      notify(new DraggableWarning('drag: unwind/step-failed', error));
      return undefined;
    }
  };
}
