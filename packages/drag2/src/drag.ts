/**
 * Shared vocabulary, reachable from any tier.
 *
 * Nothing here belongs to the kernel tier or to a behavior. `DraggableError` is
 * a class, a runtime value and not an erased type, and both tiers must be able
 * to name it: an ordinary consumer writes `err instanceof DraggableError` in
 * its `onError` handler, and a kernel-tier behavior author writes the same
 * check. Putting it on `sortable.js` would make a kernel author import the
 * sortable behavior to recognise an error the kernel raised. Putting it on
 * `kernel.js` would make an ordinary consumer import the kernel to recognise an
 * error its own handler received.
 *
 * `DraggableWarning` is here for the same reason. One channel carries both, and
 * the class that arrives is how a consumer or a kernel-tier behavior author
 * tells "my operation was affected" from "something went wrong and it did not
 * decide your outcome".
 *
 * The stage vocabulary is here for the same reason. `DraggableError.stage`
 * carries a `FailureStage` and there is no coarse code beside it. The kernel
 * tier classifies with it, the ordinary consumer receives it, and neither owns
 * it.
 *
 * This is the composition rule for this entry: a name is here when both tiers
 * must name it and neither owns it. `draggable` is on `kernel.js` because it is
 * the kernel tier's own entry point, which an ordinary consumer never names.
 */

export { DraggableError, DraggableWarning } from './kernel/errors.ts';
/**
 * The stage vocabulary, published here because the error carries one.
 *
 * `DraggableError`'s structural closure names `FailureStage`, so the type is at
 * this root. A numeric union whose members cannot be named is not a public
 * type, so the twelve constants follow it as runtime exports and do not stay
 * kernel-only. They are part of the supported consumer contract.
 *
 * There is one declaration and two publication points. `kernel/failures.ts` is
 * the single declaration, and `kernel.js` keeps its own export for the behavior
 * author who calls `kernel.fail`. This is a re-export of that same declaration,
 * the pattern already used between `kernel.js` and `sortable.js` for
 * `AT_PROPOSAL`/`AT_CONSUMER`/`CancelStage`. These are not on the behavior
 * entries, because that would split the vocabulary so that the consumer named
 * the type at one entry and the values at another.
 *
 * The tier boundary is unchanged: an ordinary consumer still never imports
 * `kernel.js`, because the stages reach that consumer from this shared root.
 */
export {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './kernel/failures.ts';
export type { DOMRealm } from './kernel/realm.ts';
export type { Point } from './kernel/types.ts';
