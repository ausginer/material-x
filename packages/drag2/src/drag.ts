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
 * owns is exactly what a shared root is for (D-64).
 *
 * ~~`draggable` and the `FAILURE_*` constants were here.~~ **D-48 moves
 * `draggable` to `kernel.js`; D-64 moves the stages there with it**, because
 * they are how a *behavior* classifies and the ordinary consumer now receives a
 * coarse code instead.
 */

export { DraggableError, type DraggableErrorCode } from './kernel/errors.ts';
export type { DOMRealm } from './kernel/realm.ts';
export type { Point } from './kernel/types.ts';
