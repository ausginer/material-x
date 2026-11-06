/**
 * Runs a function and reports a throw as a warning, so that the caller's next
 * statement still runs.
 *
 * Use this when the next statement must run: it releases another resource, runs
 * another teardown step, or rethrows the original error. Without this helper, a
 * throw from one step skips the later steps, and destruction does not finish.
 *
 * The report is a {@link DraggableWarning}, not an error. The operation's
 * terminal result, phase sequence and settlement are already decided when this
 * helper runs, so a failure here cannot change them.
 */
import { DraggableWarning, type Notify } from './errors.ts';

/**
 * Runs one cleanup step and absorbs a throw, so that the next step still runs.
 * Returns `undefined` when the step failed.
 */
export type WarnOnThrow = <T>(step: () => T) => T | undefined;

/**
 * Creates `warnOnThrow` over one notifier: a created channel or the
 * controller's route.
 *
 * Each kernel holds one closure instead of calling a free function that takes
 * the notifier. The call sites read `warnOnThrow(fn)` either way. Passing the
 * notifier at each call would put the channel's identity at every site that
 * only needs to survive a throw.
 *
 * The notifier must not throw. The end of its route guarantees this, so this
 * function needs no `try` around the report. Every site here is already inside
 * a teardown whose next step matters. A second failure mode in the reporting
 * path would stop that next step from running.
 */
export function createWarnOnThrow(notify: Notify): WarnOnThrow {
  return (step) => {
    try {
      return step();
    } catch (error) {
      // One message for every site, and `cause` carries what was caught. The
      // sites differ in which resource failed to release and not in what the
      // consumer can do about it, so a discriminating code would add nothing.
      notify(
        new DraggableWarning('drag: unwind/step-failed', { cause: error }),
      );
      return undefined;
    }
  };
}
