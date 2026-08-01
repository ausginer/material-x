/**
 * Every sortable seam, as closures over one private runtime (D-4).
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 */
import {
  FAILURE_RELEASE,
  FAILURE_REORDER_RESOLUTION,
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
import { createPlaceholder, movePlaceholder } from './placement.ts';
import { type SortableRuntime, TAG_SPATIAL } from './runtime.ts';

/** What `action.prepare(COLLECTION)` stages. It never discards (D-25). */
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  /** Non-null when the gap could not survive the replacement. */
  cancelReason: unknown;
}>;

/** A staged value that carries nothing. */
const STAGED = true;

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
   * Safe as a slot: seams are non-reentrant, and the kernel drives exactly one
   * settlement at a time.
   */
  let pendingFailure: Readonly<{ stage: FailureStage; error: unknown }> | null =
    null;

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
      actionTags: 2,
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

        // Listeners bound to the signal are self-releasing, so the signal *is*
        // the registration; the explicit disposer cancels a scheduled frame.
        scope.motion.use(rt.frame.cancel);
        invalidate(scope.motion.signal, slots.invalidateInsertion);

        // 3 — every resource above is now owned.
        rt.placeholder = placeholder;
        rt.lift = scope.lift;
        rt.view = { realm, placeholder, snapshot: current.snapshot! };
        slots.invalidateInsertion();

        // 4 — last, because it may reentrantly cancel or destroy.
        slots.onStart(current.item!);
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
      // Rendering and scheduling are one callback with two stages. The spatial
      // search is coalesced to one per frame; pointer input never is.
      rt.spatialSeq += 1;
      rt.frame.schedule(rt.spatialSeq);
    },

    // -----------------------------------------------------------------------
    // Behavior actions
    // -----------------------------------------------------------------------

    action: {
      prepare(tag, argument, draft) {
        if (tag === TAG_SPATIAL) {
          // The applied half of the double validation (I-4). The `view` test is
          // what bites today; the attempt comparison is unreachable as things
          // stand, because the frame task coalesces and dispatches the latest
          // sequence synchronously, so a queued attempt is always current when
          // it applies. It is kept because the contract states the check, and
          // because anything that later queues a spatial action from outside
          // the frame task reopens the window it closes.
          if (argument !== rt.pendingSpatial || rt.view === null) {
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
          const view = rt.view!;

          // The pipelines bracket the single writer of placeholder position.
          for (const hook of slots.beforeMove) {
            hook(view);
          }

          movePlaceholder(rt.placeholder!, current.insertion!);
          slots.invalidateInsertion();

          for (const hook of slots.afterMove) {
            hook(view);
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
          slots.invalidateInsertion();
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
        slots.invalidateInsertion();

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
