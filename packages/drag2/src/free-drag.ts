/**
 * Public entrypoint for the free-drag behavior — the **ordinary tier**.
 *
 * A consumer that drags one element freely reaches for this entry and, for
 * `instanceof DraggableError`, `drag.js`, and nothing else: `freeDrag()` takes
 * the item, calls `draggable()` internally and returns its controller (D-48), so
 * neither the kernel tier nor the installer tier is on the ordinary path. The
 * consumer never names `draggable`, never holds a behavior value, and never
 * learns that a kernel tier exists.
 *
 * **One vocabulary — `drag`, not `drop`** (D-69). The shipped package mixed
 * `FreeDrop*` types with `FreeDrag*` export-site renames and left the successor
 * to pick one. The drop is an event inside the drag; the drag is the thing being
 * configured, controlled and named, so it names the entry, the function, the
 * controller and the type family. `onDrop` keeps its name because it is the one
 * slot that really is about the drop.
 *
 * `FreeDragConfig` and **every alias it names** are exported from here (F-51),
 * because a config slot a consumer can fill but cannot hoist out of the object
 * literal is not a writable surface. **The closure is tier-scoped** (D-78): it
 * resolves within `free-drag.js ∪ drag.js ∪ free-drag/feature.js`, so
 * `FreeDragInstaller` ships from here while the names *it* reaches stay declared
 * at the middle tier, one import away for an author who wants them.
 */
import { createComposedFreeDragBehavior } from './free-drag/behavior.ts';
import type { FreeDragConfig } from './free-drag/config.ts';
import type { FreeDragController } from './free-drag/controller.ts';
import { draggable } from './kernel.ts';

export type { FreeDragController } from './free-drag/controller.ts';
/**
 * The config schema and every alias it names (D-45, F-51, D-78).
 */
export type {
  FreeDragConfig,
  FreeDragOnDragError,
  FreeDragOnEnd,
  FreeDragOnStart,
  OnMove,
  ResolveElement,
  ResolveHandle,
} from './free-drag/config.ts';
/**
 * **The two capability slots' alias, published here** (D-78): `FreeDragConfig`
 * names it, so a consumer writing a third-party constraint must be able to
 * hoist the installer into a typed `const` rather than only fill the slot
 * inline. Its own closure — `FeatureContext`, `FreeDragContribution`,
 * `MotionConstraint` — stays declared at `free-drag/feature.js`.
 */
export type { FreeDragInstaller } from './free-drag/feature.ts';
export {
  FreeDragResolution,
  type AcceptedFreeDragResolution,
  type AcceptedFreeDragResult,
  type AxisSource,
  type CanceledFreeDragResult,
  type DragAxis,
  type DragGeometry,
  type FreeDragLift,
  type FreeDragRequest,
  type FreeDragSubject,
  type FreeDragTransactionResult,
  type OnDrop,
  type RejectedFreeDragResolution,
  type RejectedFreeDragResult,
  type ResolveHome,
} from './free-drag/domain.ts';
/**
 * The cancellation stages, as **values as well as a type**, for the same reason
 * `sortable.js` re-exports them: a `CanceledFreeDragResult` carries one and an
 * ordinary consumer has to be able to discriminate it (D-68).
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * Makes one element freely draggable.
 *
 * ```ts
 * const drag = freeDrag(item, { onDrop }, bounds(stage), landing({ duration: 200 }));
 * ```
 *
 * **The first argument is the ingress root, which for a free drag *is* the
 * item** — there is no collection to search, so the element the consumer names
 * is both what the press is bound to and what is dragged.
 *
 * **The second is a complete `FreeDragConfig`; every later argument is a plain
 * partial config merged by slot** (D-77, D-45). A missing `onDrop` is therefore
 * a compile error rather than a runtime throw: it is found without running the
 * code, costs zero runtime bytes, and cannot be missed by a path that happens
 * not to execute. A later fragment may **replace** the slot and cannot **clear**
 * it — the merge skips `undefined`.
 *
 * **It throws nothing for any config the compiler accepts.** Every option domain
 * the compiler already states is left to the compiler, and a value that breaks
 * only the consumer's own drag is not the library's to police: a bad `handle`,
 * `visual`, `onMove`, `home`, `onEnd` or bounds source surfaces at the seam that
 * uses it, classified, coded and terminating the operation exactly once — while
 * a `NaN` threshold, an unknown `axis` and an unknown `lift` are **silent**,
 * because two of them never fail and the third never starts an operation, so
 * there is no terminal to owe (07 §Validation).
 */
export function freeDrag(
  item: HTMLElement,
  config: FreeDragConfig,
  ...fragments: ReadonlyArray<Partial<FreeDragConfig>>
): FreeDragController {
  return draggable(item, createComposedFreeDragBehavior(config, fragments));
}
