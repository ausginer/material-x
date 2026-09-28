/**
 * **Shared vocabulary**, reachable from any tier.
 *
 * Nothing here belongs to the kernel tier or to a behavior. `DraggableError` is
 * a **class** — a runtime value, not an erased type — and both tiers must be
 * able to name it: an ordinary consumer writes `err instanceof DraggableError`
 * in its `onError` handler, and a kernel-tier behavior author writes the same
 * check. Putting it on `sortable.js` would make a kernel author import the
 * sortable behavior to recognise an error the kernel raised; putting it on
 * `kernel.js` would make an ordinary consumer import the kernel to recognise an
 * error its own handler was given. A symbol both tiers must name and neither
 * owns is exactly what a shared root is for.
 *
 * **`DraggableWarning` joins it on the same argument.** One channel carries
 * both, and which class arrives is how a consumer — or a kernel-tier behavior
 * author — tells *my operation was affected* from *something went wrong and
 * your result stands*. A name both tiers must recognise and neither owns
 * belongs here for the same reason `DraggableError` does.
 *
 * **And so does the stage vocabulary.** `DraggableError.stage` carries a
 * `FailureStage` and there is no coarse code beside it, which is the same
 * argument a third time: the kernel tier classifies with it, the ordinary
 * consumer receives it, and neither owns it.
 *
 * **That argument is the whole composition rule for this entry.** A name sits
 * here when both tiers must name it and neither owns it; `draggable` sits on
 * `kernel.js` because it is the kernel tier's own entry point, which an
 * ordinary consumer never names.
 */

export { DraggableError, DraggableWarning } from './kernel/errors.ts';
/**
 * **The stage vocabulary, published here because the error carries one.**
 *
 * `DraggableError`'s structural closure names `FailureStage`, so the type sits
 * at this root; and *a numeric union whose members are unnameable is not a
 * public type*, so the twelve constants follow it as **runtime** exports rather
 * than staying kernel-only. They are part of the supported consumer contract.
 *
 * **One declaration, two publication points.** `kernel/failures.ts` is the
 * single declaration and `kernel.js` keeps its own export for the behavior
 * author who calls `kernel.fail`; this is a re-export of that same one, the
 * pattern already running between `kernel.js` and `sortable.js` for
 * `AT_PROPOSAL`/`AT_CONSUMER`/`CancelStage`. Not on the behavior entries: that
 * would split a vocabulary so the consumer named the type at one entry and the
 * values at another.
 *
 * The tier boundary is untouched: an ordinary consumer still never imports
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
