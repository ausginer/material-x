/**
 * Every sortable seam, as closures over one private runtime (D-4).
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 */
import {
  FAILURE_INVALIDATION,
  FAILURE_RELEASE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import type { Frame } from '../kernel/frames.ts';
import { createInvalidator } from '../kernel/invalidation.ts';
import {
  ACTIVATING,
  ACTIVE,
  IDLE,
  PENDING,
  RELEASING,
} from '../kernel/phases.ts';
import { LIFT_FLAT } from '../kernel/presentation.ts';
import { guarded } from '../kernel/reporter.ts';
import {
  type BehaviorSpec,
  type PreparedSettlement,
  type SeamRejection,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementScope,
} from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import {
  buildReorderProposal,
  CHANGE_CANCEL,
  homeInsertion,
  reconcileCollection,
} from './collection.ts';
import {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  isReorderResolution,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NOOP,
  OUTCOME_REJECTED,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
} from './domain.ts';
import {
  createSortableFramePart,
  resetSortableFramePart,
  type SortableFramePart,
} from './frames.ts';
import {
  createPlaceholder,
  movePlaceholder,
  placeholderAt,
} from './placement.ts';
import type { DisplacementView } from './slots.ts';
import {
  SORTABLE_ACTION_TAGS,
  type SortableRuntime,
  TAG_INVALIDATION,
  TAG_SPATIAL,
} from './runtime.ts';

/** What `action.prepare(COLLECTION)` stages. It never discards (D-25). */
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  /** Non-null when the gap could not survive the replacement. */
  cancelReason: unknown;
}>;

/** A staged value that carries nothing. */
/**
 * The spatial action's staged value. Exported so the legality guard can be
 * driven directly in a test: no producer can reach the illegal phases, so the
 * guard is otherwise unobservable.
 */
export const STAGED = true;

const rejection = (stage: FailureStage, message: string): SeamRejection => ({
  stage,
  error: new Error(message),
});

export function createSortableSpec(
  rt: SortableRuntime,
): BehaviorSpec<SortableFramePart> {
  const { host, slots } = rt;
  const { realm } = host;
  // One per controller. Arming is per operation, on the motion signal.
  const invalidate = createInvalidator(realm);

  /**
   * The failure the open settlement seam is reporting, handed from `prepare` to
   * `effect` because `PreparedSettlement` carries only the readiness promise.
   *
   * **This is an accepted out-of-band channel, not an oversight** — reviewed
   * and deliberately kept rather than widening the frozen `PreparedSettlement`
   * (checkpoint A, A-13). What makes it transaction-safe is not "seams do not
   * currently re-enter" but a stronger, enforced property:
   *
   * 1. `runCore` is the only driver of this seam and always runs `prepare`
   *    before `effect`, and `prepare` **clears the slot on entry** (below).
   *    So a value can only ever be read by the effect of the very transaction
   *    whose prepare wrote it — there is no window in which one settlement's
   *    effect could observe another's failure.
   * 2. Every path that abandons a transaction between the two phases —
   *    `prepare` returning a `SeamRejection`, `SEAM_INVALIDATED` from a held
   *    cancel latch, a reentrant `destroy()` — skips the effect and therefore
   *    leaves the slot set; the *next* prepare's clear is what collects it.
   *    Staleness is impossible by construction, not by timing.
   * 3. The driver refuses a nested seam outright (`refuseReentry`), so no
   *    third party can interleave a write between the pair.
   *
   * The cost of the alternative is a change to a frozen SPI type with no
   * failing executable case behind it, which contract 00 forbids. Revisit only
   * if a real case appears; the invariant to preserve if this is ever touched
   * is (1) — **prepare must clear before it can write**.
   */
  let pendingFailure: Readonly<{ stage: FailureStage; error: unknown }> | null =
    null;

  /**
   * `invalidateInsertion()` narrowed to its own stage.
   *
   * Every call site below is inside a kernel-driven seam, so the surrounding
   * phase would otherwise classify a throw as *its* stage — an activation
   * failure, a placeholder-move failure — and `DragErrorContext.stage` would
   * name the wrong thing. `host.fail` narrows from the inside, which is the
   * mechanism the contract specifies for exactly this (contract 02 §Failure
   * classification: `INVALIDATION` (home)).
   *
   * Returns whether it succeeded, because the latched failure already decides
   * the seam's outcome: a caller that would go on to publish or to notify must
   * stop instead.
   */
  const invalidateInSeam = (): boolean => {
    try {
      slots.invalidateInsertion();
      return true;
    } catch (error) {
      host.fail(FAILURE_INVALIDATION, error);
      return false;
    }
  };

  /** The gap the item came from, recomputed rather than stored. */
  const homeGap = (frame: Readonly<Frame<SortableFramePart>>): void => {
    const home = homeInsertion(frame.snapshot!, frame.item!);

    if (home !== null) {
      movePlaceholder(rt.placeholder!, home);
    }
  };

  return {
    createFramePart: createSortableFramePart,
    resetFramePart: resetSortableFramePart,

    config: {
      threshold: slots.threshold,
      liftMode: LIFT_FLAT,
      readinessTimeout: 500,
      actionTags: SORTABLE_ACTION_TAGS,
    },

    // -----------------------------------------------------------------------
    // Admission — inside the native `pointerdown` dispatch
    // -----------------------------------------------------------------------

    admit(event, draft) {
      const { snapshot } = rt;
      // The composed path, not `event.target`: the press may land inside a
      // shadow root, and the item is whichever ancestor the snapshot knows.
      const path = event.composedPath();
      let item: HTMLElement | null = null;

      for (const node of path) {
        if (snapshot.items.includes(node as HTMLElement)) {
          item = node as HTMLElement;
          break;
        }
      }

      if (item === null) {
        return null;
      }

      if (slots.getHandle !== null) {
        const handle = slots.getHandle(item);

        // A handle *narrows* admission; it never replaces the item.
        if (handle === null || !path.includes(handle)) {
          return null;
        }
      }

      const visual = slots.getVisual === null ? item : slots.getVisual(item);

      event.preventDefault();
      draft.item = item;
      draft.visual = visual;
      draft.snapshot = snapshot;
      return visual;
    },

    // -----------------------------------------------------------------------
    // Activation
    // -----------------------------------------------------------------------

    activation: {
      /**
       * Creates the placeholder **detached** and seeds the home insertion. No
       * DOM insertion, no acquisition, nothing externally visible — which is
       * why `rollback` is unnecessary here and why I-17 is vacuous for this
       * behavior.
       */
      prepare(draft, scope) {
        const item = draft.item!;
        const home = homeInsertion(draft.snapshot!, item);

        if (home === null) {
          return null; // the item left the collection between press and move
        }

        draft.insertion = home;
        return createPlaceholder(
          realm,
          item,
          scope.visual,
          scope.originRect,
          slots.createPlaceholder,
        );
      },

      /** Strict I-30 order: register, make visible, publish, then notify. */
      effect(current, placeholder, scope) {
        // 1 → 2, per resource. Registering first is free — removing a detached
        // node is a no-op, so an over-eager disposer cannot over-release — and
        // it means a throw below can never leave a visible orphan that the
        // presentation lifetime does not own.
        scope.presentation.use(() => {
          placeholder.remove();
        });
        current.item!.after(placeholder);

        // `after()` **connects** the placeholder, and a custom element's
        // `connectedCallback` runs synchronously inside that call. It is
        // consumer code — the placeholder may come from a `placeholder()`
        // factory — reached from a plain DOM write, so no seam wraps it and no
        // reentrancy guard above sees it. If it destroyed the controller,
        // teardown has already run to completion: the disposer registered on
        // the line above removed this node, motion and presentation are closed,
        // and the operation is retired. Everything below would then register
        // against closed lifetimes (releasing immediately and reporting),
        // republish this operation's DOM into the runtime for the *next* drag
        // to find, and call `onStart` after `destroy()` returned — the
        // synchronous terminal barrier I-6 forbids crossing (D-26).
        if (scope.presentation.signal.aborted) {
          return;
        }

        // Everything below assumes the insertion actually took, and a
        // `connectedCallback` gets to run between `after()` and this line. It
        // can remove itself, move itself, or reparent the *item* — and a
        // detached or misplaced placeholder is not a footprint: `placeholderAt`
        // would read the wrong container's siblings, `movePlaceholder` would
        // relocate a node the collection no longer contains, and the landing
        // would measure a rect that is not in the list at all.
        //
        // Cheaper than trusting it and repairing later, and classified where it
        // belongs: a throw here is `FAILURE_ACTIVATION` from the committed
        // state, so the placeholder disposer registered above removes it, the
        // consumer gets `onError` with the activation stage, and nothing was
        // published or notified.
        // Two conjuncts, each catching what the other cannot. Adjacency alone
        // already implies same-parent, so a separate parentage test would be
        // unfalsifiable; but adjacency holds inside a detached fragment too, so
        // connectivity is not implied by it.
        const item = current.item!;

        if (
          !placeholder.isConnected ||
          item.nextElementSibling !== placeholder
        ) {
          throw new Error(
            'drag: the placeholder did not survive insertion — it was removed or reparented before activation completed',
          );
        }

        // Listeners bound to the signal are self-releasing, so the signal *is*
        // the registration; the explicit disposer cancels a scheduled frame.
        scope.motion.use(rt.frame.cancel);
        invalidate(scope.motion.signal, () => {
          try {
            slots.invalidateInsertion();
          } catch (error) {
            // A native scroll/resize listener is **not** a seam, so `host.fail`
            // here would be downgraded to a platform report and the stage would
            // never reach `onError` — one input path silently bypassing the
            // classified-failure mechanism entirely. Queuing it as a behavior
            // action gives it a seam: the action's own `prepare` runs against
            // the live operation, which is where `FAILURE_INVALIDATION` can be
            // classified with the recovery the contract gives it.
            host.dispatch(TAG_INVALIDATION, error);
          }
        });

        // 3 — every resource above is now owned.
        rt.placeholder = placeholder;
        rt.lift = scope.lift;
        rt.view = {
          realm,
          placeholder,
          snapshot: current.snapshot!,
          insertion: null,
        };

        if (!invalidateInSeam()) {
          // Classified; the operation is failing, so do not start it.
          //
          // This is the one path that reaches a terminal callback without a
          // start notification — and only in combination with a second fault: a
          // cancellation latched from the placeholder's `connectedCallback`
          // above outranks this classified failure (I-22), so the operation
          // settles as *canceled* for a drag `onStart` never announced. Either
          // fault alone is fine: without the cancel this reports through
          // `onError`, and without the throw `onStart` still runs. Recorded in
          // contract 02 §I-31 as an admitted gap rather than closed with a
          // per-operation "started" flag.
          return;
        }

        // 4 — last, because it may reentrantly cancel or destroy.
        slots.onStart(item);
      },
    },

    // -----------------------------------------------------------------------
    // The hot path
    // -----------------------------------------------------------------------

    moved(current, lift) {
      lift.write(
        current.pointerX - current.originX,
        current.pointerY - current.originY,
      );
      // Rendering and scheduling are one callback with **two stages**. The
      // kernel's wrapper classifies the whole call `FAILURE_RENDERER_WRITE`, so
      // the scheduling half narrows from the inside — otherwise a scheduling
      // failure is reported to the consumer as a render failure and
      // `FAILURE_SCHEDULED_FRAME` has no producer at all (contract 02 §F-40).
      // The spatial search is coalesced to one per frame; pointer input is not.
      rt.spatialSeq += 1;

      try {
        rt.frame.schedule(rt.spatialSeq);
      } catch (error) {
        host.fail(FAILURE_SCHEDULED_FRAME, error);
      }
    },

    // -----------------------------------------------------------------------
    // Behavior actions
    // -----------------------------------------------------------------------

    action: {
      prepare(tag, argument, draft) {
        if (tag === TAG_INVALIDATION) {
          // Re-raised where it can be classified; see the listener in
          // `activation.effect`. `host.fail` latches, so the seam ends as a
          // failure and the `null` below is never the deciding value.
          host.fail(FAILURE_INVALIDATION, argument);
          return null;
        }

        if (tag === TAG_SPATIAL) {
          // The applied half of the double validation (I-4). The `view` test is
          // what bites today; the attempt comparison is unreachable as things
          // stand, because the frame task coalesces and dispatches the latest
          // sequence synchronously, so a queued attempt is always current when
          // it applies. It is kept because the contract states the check, and
          // because anything that later queues a spatial action from outside
          // the frame task reopens the window it closes.
          // The legality table declares the spatial action inert outside
          // `ACTIVE`, and `rt.view` cannot stand in for that: it is cleared
          // only at retirement, so it stays non-null through `RELEASING`,
          // `SETTLING` and `FINALIZING`. No producer can reach those phases
          // today — the frame task is cancelled when motion closes at release,
          // and no other call site dispatches this tag — so this guard is
          // unreachable by construction rather than by luck. It is here so
          // that a future producer (a replayed action, a flush from a hook)
          // cannot commit a placeholder move into a decided transaction.
          if (
            draft.phase !== ACTIVE ||
            argument !== rt.pendingSpatial ||
            rt.view === null
          ) {
            return null;
          }

          const resolved = slots.resolveInsertion(draft, rt.view);

          if (resolved === null) {
            return null; // the incumbent slot still wins — commit nothing
          }

          draft.insertion = resolved;
          return STAGED;
        }

        const next = argument as CollectionSnapshot;
        const { phase } = draft;

        // `IDLE`: publish, but bind nothing — an idle frame must retain no DOM
        // (I-20). `RELEASING` and later: the operation's semantic snapshot is
        // frozen and the transaction is decided, so the replacement publishes
        // without rewriting what the release resolved against.
        if (phase === IDLE || phase >= RELEASING) {
          return {
            snapshot: next,
            cancelReason: null,
          } satisfies PreparedCollection;
        }

        draft.snapshot = next;

        if (!next.items.includes(draft.item!)) {
          return {
            snapshot: next,
            cancelReason: CANCEL_ITEM_REMOVED,
          } satisfies PreparedCollection;
        }

        // `PENDING` has no insertion to rebase: the item surviving is the whole
        // question. `ACTIVATING` reconciles exactly like `ACTIVE`, because I-30
        // has already published the runtime and committed the home insertion
        // before `onStart` could queue this action (F-32).
        if (phase === PENDING) {
          return {
            snapshot: next,
            cancelReason: null,
          } satisfies PreparedCollection;
        }

        const change = reconcileCollection(next, draft.item!, draft.insertion);

        if (change.type === CHANGE_CANCEL) {
          return {
            snapshot: next,
            cancelReason: CANCEL_COLLECTION_INVALIDATED,
          } satisfies PreparedCollection;
        }

        draft.insertion = change.insertion;
        return {
          snapshot: next,
          cancelReason: null,
        } satisfies PreparedCollection;
      },

      effect(tag, _argument, current, prepared) {
        if (tag === TAG_SPATIAL) {
          const placeholder = rt.placeholder!;
          const insertion = current.insertion!;

          // Decided **before** the hooks run, not by the writer's return value.
          // The pipelines bracket the write, so a `beforeMove` hook that
          // measures the whole list would otherwise be paid in full for a write
          // that never happens — and with `layoutAnimation()` that is two
          // list-wide measurements and a cache rebuild per inert frame. An
          // already-correct gap is the common case, not the rare one.
          if (placeholderAt(placeholder, insertion)) {
            return;
          }

          const view = rt.view!;

          // Published before the bracket, so a hook knows *which* elements the
          // move affects rather than having to measure the whole destination
          // view to find out (M-4).
          view.insertion = insertion;

          for (const hook of slots.beforeMove) {
            hook(view as DisplacementView);
          }

          movePlaceholder(placeholder, insertion);

          if (!invalidateInSeam()) {
            return; // classified; the geometry the hooks would read is stale
          }

          for (const hook of slots.afterMove) {
            hook(view as DisplacementView);
          }

          return;
        }

        const staged = prepared as PreparedCollection;
        const { phase } = current;

        // Publication is an effect, not a preparation: a reentrant cancel or
        // destroy must not be able to invalidate a preparation whose private
        // runtime has already been replaced.
        rt.snapshot = staged.snapshot;

        if (rt.view !== null) {
          rt.view.snapshot = staged.snapshot;
        }

        if (phase === ACTIVATING || phase === ACTIVE) {
          // Not gated on success: publication already happened above, and the
          // consumer's update must never be thrown away by a failing
          // invalidation (D-25, F-28). The latched failure still decides the
          // seam.
          invalidateInSeam();
        }

        // Last, and only after publication: an invalid collection ends the
        // current drag, but it must never throw away the consumer's update
        // (D-25, F-28).
        if (staged.cancelReason !== null) {
          host.cancel(staged.cancelReason);
        }
      },
    },

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------

    release: {
      prepare(draft) {
        const { view } = rt;
        const { item } = draft;
        const { snapshot } = draft;

        if (view === null || item === null || snapshot === null) {
          return rejection(
            FAILURE_RELEASE,
            'drag: released an operation with no published presentation',
          );
        }

        // Motion is already closed, so this search runs against final geometry.
        if (!invalidateInSeam()) {
          return { invoke: null };
        }

        const insertion =
          slots.resolveInsertion(draft, view) ?? draft.insertion;

        if (insertion === null) {
          return rejection(FAILURE_RELEASE, 'drag: released with no insertion');
        }

        draft.insertion = insertion;

        const built = buildReorderProposal(snapshot, item, insertion);

        if (built === null) {
          // A release that finds no coherent proposal has a broken invariant.
          // Reporting it as a successful no-op drop would tell the consumer the
          // drag completed normally.
          return rejection(
            FAILURE_RELEASE,
            'drag: the resolved insertion does not describe a gap in the released snapshot',
          );
        }

        draft.proposal = built.proposal;

        if (built.noop) {
          // The **only** legitimate skip: a proven `from === to`.
          return { invoke: null };
        }

        const { request } = built.proposal;

        return {
          invoke: (signal) => slots.onReorder(request, { signal }),
        };
      },

      effect(current) {
        movePlaceholder(rt.placeholder!, current.insertion!);
        // Normative, not decoration: `pointerup` need not carry the last
        // processed `pointermove`'s coordinates, and the proposal was computed
        // from the committed release point. Rendering the placeholder alone
        // would leave the visual — and the whole landing trajectory — starting
        // from a stale point (F-39).
        rt.lift!.write(
          current.pointerX - current.originX,
          current.pointerY - current.originY,
        );
      },
    },

    // -----------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------

    settlement: {
      /** The five-case mapping, covered exhaustively (D-24, F-29). */
      prepare(draft, input): PreparedSettlement | SeamRejection {
        pendingFailure = null;

        const { proposal } = draft;

        // No `default`, deliberately: an exhaustive switch over the
        // discriminant is what makes a new settlement case a *compile* error
        // here rather than a silent fall-through to some plausible outcome.
        // oxlint-disable-next-line default-case
        switch (input.type) {
          case SETTLED_SKIPPED: {
            // The placeholder is already where the item belongs, so recovery is
            // immediate. A no-op finishes; it is never a rejection.
            draft.outcome = OUTCOME_NOOP;
            draft.recovery = RECOVERY_IMMEDIATE;
            draft.domain = { type: 'noop', proposal: proposal! };
            return { ready: null };
          }

          case SETTLED_FULFILLED: {
            const { value } = input;

            if (!isReorderResolution(value)) {
              return rejection(
                FAILURE_REORDER_RESOLUTION,
                'drag: onReorder resolved with a value that is not a ReorderResolution',
              );
            }

            if (value.type === 'accepted') {
              draft.outcome = OUTCOME_ACCEPTED;
              draft.recovery = RECOVERY_DESTINATION;
              draft.domain = { type: 'accepted', proposal: proposal! };
            } else {
              draft.outcome = OUTCOME_REJECTED;
              draft.recovery = RECOVERY_HOME;
              draft.domain = {
                type: 'rejected',
                reason: value.reason,
                proposal: proposal!,
              };
            }

            return { ready: value.presentationReady ?? null };
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict, so it is a named classified failure rather than
            // an inferred `onCancel`.
            return {
              stage: FAILURE_REORDER_RESOLUTION,
              error: input.error,
            };
          }

          case SETTLED_CANCELED: {
            draft.outcome = OUTCOME_CANCELED;
            draft.recovery = RECOVERY_HOME;
            draft.domain = {
              type: 'canceled',
              reason: input.reason,
              stage: input.stage,
              proposal,
            };
            return { ready: null };
          }

          case SETTLED_FAILED: {
            pendingFailure = { stage: input.stage, error: input.error };

            // A terminal-callback failure has recovery "none": the operation
            // already finalized, and rewriting the outcome now would relabel a
            // drop that has been reported as accepted. Every other stage
            // replaces the transaction.
            if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
              draft.outcome = OUTCOME_FAILED;
              draft.recovery = RECOVERY_IMMEDIATE;
              draft.domain = null;
            }

            return { ready: null };
          }
        }
      },

      effect(current, prepared, scope: SettlementScope) {
        const failure = pendingFailure;

        pendingFailure = null;

        if (failure === null) {
          // Requests only — nothing is armed here, and a request is recorded at
          // most once.
          if (prepared.ready !== null) {
            scope.holdForReadiness(prepared.ready);
          }

          if (
            slots.startLanding !== null &&
            current.recovery !== RECOVERY_IMMEDIATE
          ) {
            scope.holdForLanding(slots.startLanding);
          }
        }

        // 4 — consumer callbacks last. A failed settlement reports through
        // `onError` **only**: no `onFinish`, no `onCancel`, and `finalized` is
        // never reached for it.
        if (failure !== null) {
          slots.onError?.(failure.error, {
            stage: failure.stage,
            domain: current.domain,
          });
        }
      },
    },

    // -----------------------------------------------------------------------
    // Landing target and the terminal callback
    // -----------------------------------------------------------------------

    anchorTarget(current, authoredReady): Point {
      const placeholder = rt.placeholder!;
      const { recovery } = current;

      if (recovery === RECOVERY_DESTINATION) {
        // Re-anchoring follows the **recovery**, and is gated on the authored
        // presentation being final: with a readiness promise still pending the
        // consumer has not committed, so re-anchoring now would drag the
        // placeholder back beside the item's old slot.
        if (authoredReady) {
          const item = current.item!;

          // Each conjunct earns its place. `nextElementSibling` makes the
          // repair inert when the placeholder is already adjacent — `before()`
          // on an already-correct position is a remove-and-reinsert that resets
          // CSS transitions and forces a reflow. `isConnected` and the parent
          // test stop a consumer that unmounted or re-keyed the item from
          // having the placeholder dragged into a detached tree, which would
          // destroy the very element the fallback measures (F-15, Q-12).
          if (
            item.isConnected &&
            item.parentElement === placeholder.parentElement &&
            placeholder.nextElementSibling !== item
          ) {
            item.before(placeholder);
          }
        }
      } else if (recovery === RECOVERY_HOME) {
        // Rejected, cancelled and most failures return the placeholder to the
        // grab slot before measuring. The home gap is recomputed from the
        // committed snapshot, so it needs no per-operation slot.
        homeGap(current);
      }

      const rect = placeholder.getBoundingClientRect();

      return { x: rect.left, y: rect.top };
    },

    /**
     * An **exhaustive switch on the domain discriminant**, not a binary
     * accepted-vs-everything predicate: the earlier shape sent the no-op result
     * to `onCancel` (F-37).
     */
    finalized(current) {
      const { domain } = current;

      if (domain === null) {
        return; // a failed settlement: `onError` only
      }

      // The same reason as the settlement switch: F-37 exists because a binary
      // accepted-vs-everything predicate sent the no-op result to `onCancel`.
      // oxlint-disable-next-line default-case
      switch (domain.type) {
        case 'accepted':
        case 'noop':
          slots.onFinish?.(domain);
          break;
        case 'rejected':
        case 'canceled':
          slots.onCancel?.(domain);
          break;
      }
    },

    /**
     * A failure with no operation to settle: `admit` threw, so identity was
     * never minted and there is no checkpoint to queue (Q-1). The controller
     * stays idle and usable.
     */
    reportFailure(stage, error) {
      slots.onError?.(error, { stage, domain: null });
    },

    retire() {
      rt.frame.cancel();
      rt.pendingSpatial = 0;
      rt.placeholder = null;
      rt.lift = null;
      rt.view = null;

      // Already in reverse installation order. Each is wrapped individually, so
      // one throwing hook cannot stop a later one from restoring its DOM.
      for (const hook of slots.retireHooks) {
        guarded(hook);
      }
    },
  };
}
