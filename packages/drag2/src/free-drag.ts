/**
 * Public entrypoint for the free-drag behavior — the **ordinary tier**.
 *
 * A consumer that drags one element freely reaches for this entry and, for
 * `instanceof DraggableError`, `drag.js`, and nothing else: `freeDrag()` takes
 * the item, calls `draggable()` internally and returns its controller, so
 * neither the kernel tier nor the installer tier is on the ordinary path. The
 * consumer never names `draggable`, never holds a behavior value, and never
 * learns that a kernel tier exists.
 *
 * **One vocabulary — `drag`, not `drop`.** The drop is an event inside the
 * drag; the drag is the thing being configured, controlled and named, so it
 * names the entry, the function, the controller and the type family. `onDrop`
 * keeps its name because it is the one slot that really is about the drop.
 *
 * `FreeDragConfig` and **every alias it names** are exported from here, because
 * a config slot a consumer can fill but cannot hoist out of the object literal
 * is not a writable surface. **The closure is tier-scoped**: it resolves within
 * `free-drag.js ∪ drag.js ∪ free-drag/feature.js`, so `ConstraintInstaller`,
 * `FreeDragLandingInstaller` and `FreeDragPlugin` ship from here while the
 * names *they* reach stay declared at the middle tier, one import away for an
 * author who wants them.
 */
import { createComposedFreeDragBehavior } from './free-drag/behavior.ts';
import type { FreeDragConfig } from './free-drag/config.ts';
import type { FreeDragController } from './free-drag/controller.ts';
import type {
  ConstraintContribution,
  FreeDragPluginContribution,
  LandingContribution,
} from './free-drag/feature.ts';
import { draggable } from './kernel.ts';
import type { Composed, UniqueSlot } from './shared/composition.ts';

export type { FreeDragController } from './free-drag/controller.ts';
/**
 * The config schema and every alias it names: a config slot a consumer can fill
 * but cannot hoist out of the object literal is not a writable surface.
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
 * **The three capability slots' aliases, published here.** `FreeDragConfig`
 * names each of them — `bounds?` by `ConstraintInstaller`, `landing?` by
 * `FreeDragLandingInstaller`, `plugins?` by `FreeDragPlugin` — so a consumer
 * writing a third-party constraint must be able to hoist the installer into a
 * typed `const` rather than only fill the slot inline. Their own closure —
 * `FeatureContext`, `ConstraintContribution`, `MotionConstraint` — stays
 * declared at `free-drag/feature.js`.
 */
export type {
  ConstraintInstaller,
  FreeDragLandingInstaller,
  FreeDragPlugin,
} from './free-drag/feature.ts';
export {
  FreeDragResolution,
  type AcceptedFreeDragResult,
  type CanceledFreeDragResult,
  type DragAxis,
  type DragGeometry,
  type FreeDragRequest,
  type FreeDragSubject,
  type FreeDragTransactionResult,
  type OnDrop,
  type RejectedFreeDragResult,
  type ResolveHome,
} from './free-drag/domain.ts';
// **The lift vocabulary, published where the slot that takes it is.**
// `config.lift` is a `LiftMode`, and a numeric union whose members are
// unnameable is not a fillable slot — so the three constants come with it,
// exactly as the stage constants follow `FailureStage` onto `drag.js`. They are
// one declaration in `kernel/presentation.ts`, published from here *and* from
// `kernel.js`.
export {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from './kernel/presentation.ts';
/**
 * The cancellation stages, as **values as well as a type**, for the same reason
 * `sortable.js` re-exports them: a `CanceledFreeDragResult` carries one and an
 * ordinary consumer has to be able to discriminate it.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * **The cancellation origins**, on the same argument: a
 * `CanceledFreeDragResult` carries one, and it is the only field that says who
 * decided. This behavior mints no `reason` of its own, so for a free drag
 * `origin` is the whole of the provenance.
 */
export {
  CANCEL_ABORTED,
  CANCEL_FAILED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  type CancelOrigin,
} from './kernel/failures.ts';

/**
 * **The composition check, applied to one config or fragment.**
 *
 * An installer may contribute only the slots its position is read for: the
 * assembler reads `constrain` from `bounds` and `landingTiming` from `landing`,
 * positionally, and the plugin loop reads `retire` and nothing else. So a
 * constraint installer passed as a plugin is not a second writer — it is one
 * writer at a position that is never read, and its capability is silently
 * absent. This intersects a refusal into exactly those entries, and leaves
 * every legitimate plugin as it is.
 *
 * Erased entirely, and named by the signature below rather than by any config
 * slot, so an ordinary consumer never writes it.
 */
export type FreeDragComposition<T> = T extends { plugins?: infer P }
  ? Readonly<{
      plugins?: Composed<
        P,
        // The unique slots, **derived from the groups themselves** — every key
        // a sibling group declares and the plugin group does not, so a
        // capability added later joins the set by being declared. Written here
        // rather than as its own alias: an intermediate name would be a second
        // published type whose only role is to be substituted into this one.
        UniqueSlot<
          ConstraintContribution | LandingContribution,
          FreeDragPluginContribution
        >
      >;
    }>
  : unknown;

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
 * partial config merged by slot.** A missing `onDrop` is therefore a compile
 * error rather than a runtime throw. A later fragment may **replace** the slot
 * and cannot **clear** it — the merge skips `undefined`.
 *
 * **It throws nothing for any config the compiler accepts.** Every option
 * domain the compiler already states is left to the compiler, and a value that
 * breaks only the consumer's own drag is not the library's to police: a bad
 * `handle`, `visual`, `onMove`, `home`, `onEnd` or bounds source surfaces at
 * the seam that uses it, classified, coded and terminating the operation
 * exactly once — while a `NaN` threshold and an unknown `axis` are **silent**,
 * because neither ever fails. `lift` has no unknown value to be: the slot takes
 * the kernel's own `LiftMode`.
 */
export function freeDrag<
  const C extends FreeDragConfig,
  const F extends ReadonlyArray<Partial<FreeDragConfig>>,
>(
  item: HTMLElement,
  config: C & FreeDragComposition<C>,
  ...fragments: { [I in keyof F]: F[I] & FreeDragComposition<F[I]> }
): FreeDragController {
  return draggable(item, createComposedFreeDragBehavior(config, fragments));
}
