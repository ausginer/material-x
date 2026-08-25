/**
 * Every free-drag seam, as closures over one private runtime (D-4).
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 *
 * **`Activation` is `true`** (D-34). Free drag stages nothing at activation — no
 * placeholder, no detached node, no acquired resource — so under the pinned
 * `HTMLElement` its `prepare` would have had to return `scope.visual`, an
 * element the kernel already holds, with `effect` ignoring what it was handed.
 * That is the staged-resource contract inverted, which is F-44 exactly, and it
 * is what D-34 made expressible.
 */
import { toDraggableError } from '../kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_RELEASE,
  FAILURE_RESOLUTION,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import { pathOwnsInteraction, POINTER_OWNERS } from '../kernel/input-policy.ts';
import { createInvalidator } from '../kernel/invalidation.ts';
import { ACTIVATING, ACTIVE } from '../kernel/phases.ts';
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
} from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import {
  type DragAxis,
  type FreeDragSubject,
  type FreeDragTransactionResult,
  isFreeDragResolution,
} from './domain.ts';
import type { ConstraintView, MotionDraft } from './feature.ts';
import {
  createFreeDragFramePart,
  type FreeDragFramePart,
  resetFreeDragFramePart,
} from './frames.ts';
import { applyAxis, buildGeometry, buildRequest } from './geometry.ts';
import {
  FREE_DRAG_ACTION_TAGS,
  type FreeDragRuntime,
  TAG_POLICY,
  TAG_POSITION,
} from './runtime.ts';

/**
 * The three states of D-66's progress marker, module-private because they are
 * behavior-internal: nothing outside this file may read how far an operation
 * got, and nothing in the kernel could interpret it if it did.
 */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

const rejection = (stage: FailureStage, message: string): SeamRejection => ({
  stage,
  error: new Error(message),
});

export function createFreeDragSpec(
  rt: FreeDragRuntime,
): BehaviorSpec<FreeDragFramePart> {
  const { host, slots } = rt;
  const { realm, root } = host;
  // One per controller. Arming is per operation, on the motion signal.
  const invalidate = createInvalidator(realm);

  /**
   * **How far the operation got, as one monotone marker** (D-66). Per
   * operation, cleared in `retire()`. It exists because the failure path owes a
   * terminal and the kernel cannot supply the two facts that decide which one:
   * *did the consumer hear this drag start*, and *was its resolver actually
   * invoked*. Both are behavior knowledge.
   */
  let progress = MINTED;

  /**
   * The failure the open settlement seam is reporting, handed from `prepare` to
   * `effect` because `PreparedSettlement` carries only the gate declaration —
   * the same accepted out-of-band channel the sortable uses, safe for the same
   * reason: `prepare` clears the slot on entry, so a value can only ever be
   * read by the effect of the transaction whose prepare wrote it.
   */
  let pendingFailure: Readonly<{ stage: FailureStage; error: unknown }> | null =
    null;

  /**
   * **One scratch draft per controller, written in place** (D-70, 13c P-1 as
   * corrected at C-07). The constraint writes clamped scalars back into this
   * object rather than returning a `Point`, so the per-sample path allocates
   * nothing — which is the whole reason `MotionConstraint.apply` has the shape
   * it has.
   */
  const motion: MotionDraft = { x: 0, y: 0 };
  /** Built once per operation, in `activation.effect`. */
  let view: ConstraintView | null = null;

  /**
   * **`apply` and `invalidate`, lifted once here** (D-90). `retire` is not one
   * of them — the assembler lifts that one and owns both its call sites.
   *
   * No site below may call these with `constrain` as the receiver: the
   * convention on `MotionConstraint` is that an author may not depend on
   * `this`, and it survives only while nothing re-attaches a member to the
   * record it came from. Lifting also keeps each site to one call rather than a
   * record read plus a member read.
   *
   * `tests/free-drag/anchor.browser.test.ts` drives each site alone with a
   * constraint that records the receiver it is handed, so re-attaching any one
   * of them fails a row.
   */
  const { constrain } = slots;
  const applyConstraint = constrain === null ? null : constrain.apply;
  const invalidateConstraint = constrain === null ? null : constrain.invalidate;

  /**
   * The rendered delta, derived rather than stored (07 §The frame part). It is
   * a pure function of the committed sample, the frame's offset and the policy,
   * so every reader derives it and none mirrors the kernel's own record.
   *
   * Writes into `motion` and returns nothing: a `Point` return would put an
   * allocation on the hot path for a value three of the four callers immediately
   * destructure.
   */
  const deriveMotion = (
    pointerX: number,
    pointerY: number,
    originX: number,
    originY: number,
    offsetX: number,
    offsetY: number,
  ): void => {
    motion.x = pointerX - originX + offsetX;
    motion.y = pointerY - originY + offsetY;
    // **Core, not a capability** (D-70): two comparisons and no state.
    applyAxis(motion, rt.axis);
    // **One indirect call, only when something filled the slot.** A composition
    // without `bounds()` pays one property read and one predictable branch, and
    // carries no clamp arithmetic and no rect resolver at all (B-2).
    applyConstraint?.(motion, view!);
  };

  /** The subject `home` is asked about, and the request carries. */
  const subjectOf = (visual: HTMLElement): FreeDragSubject => ({
    item: root,
    visual,
  });

  return {
    createFramePart: createFreeDragFramePart,
    resetFramePart: resetFreeDragFramePart,

    config: {
      threshold: slots.threshold,
      liftMode: slots.liftMode,
      actionTags: FREE_DRAG_ACTION_TAGS,
    },

    // -----------------------------------------------------------------------
    // Admission — inside the native `pointerdown` dispatch
    // -----------------------------------------------------------------------

    /**
     * D-46's input policy and D-50's handle scoping, then the visual resolver.
     * Returns **a bare element** — D-59's common form — because free drag has no
     * separate geometry source: there is no placeholder, so nothing measures a
     * footprint and `box === visual` is not a choice being repeated.
     *
     * **The item is `root`.** `freeDrag(item, …)` passes the item as the ingress
     * boundary, so the ingress root and the dragged item are the same element by
     * construction rather than by lookup — which is why there is no composed-path
     * search here and no collection to search.
     */
    admit(event, draft) {
      // **A modifier requests native text selection; its absence means drag**
      // (D-46). One branch, no state, no disambiguation window.
      if (event.altKey) {
        return null;
      }

      const path = event.composedPath();
      let subject = path.indexOf(root);

      if (subject === -1) {
        return null;
      }

      if (slots.getHandle !== null) {
        const handle = slots.getHandle(root);

        // **The terminal barrier on the admission sequence** (I-36). `handle`
        // is consumer code and `visual` is called right after it returns, so a
        // handle resolver that destroyed the controller would otherwise have a
        // second consumer resolver called after `destroy()` returned.
        //
        // It **declines**, it does not throw: a throw reaches
        // `reportFailure(FAILURE_ADMISSION)` and would tell the consumer that
        // its own `destroy()` was a library failure.
        if (host.closed || handle === null) {
          return null;
        }

        // **The resolved subject governs** (D-50). A handle inside the item
        // sits earlier in the composed path, so scoping to it shortens the
        // segment the decline test walks — and a handle that is itself an
        // interactive element admits, because the consumer scoped dragging
        // there on purpose.
        subject = path.indexOf(handle);

        if (subject === -1) {
          return null;
        }
      }

      // **What did the event land on** (D-46), asked after the subject is known
      // and before anything is seeded. A press reaching an interactive or
      // editable descendant declines by the ordinary total-decline path: no
      // operation, no phase change, and — since the kernel prevents nothing for
      // a `null` — focus lands and the caret places.
      if (pathOwnsInteraction(path, subject, POINTER_OWNERS)) {
        return null;
      }

      let visual = root;

      if (slots.getVisual !== null) {
        visual = slots.getVisual(root);

        // The terminal barrier on the visual resolver (I-36). `runAdmission`
        // revalidates after this whole callback and declines the operation, but
        // it does not scrub the draft it declined — so without this the write
        // below would pin the visual in an inactive frame nothing clears again
        // (I-20).
        if (host.closed) {
          return null;
        }
      }

      draft.visual = visual;

      return visual;
    },

    /**
     * **No `command` member** (07 §What free drag does not have). Free drag has
     * no discrete ingress: `arm()` binds `pointerdown` and nothing else.
     * Keyboard free drag has no shipped counterpart and no parity row, so it is
     * not invented here.
     */

    // -----------------------------------------------------------------------
    // Activation
    // -----------------------------------------------------------------------

    activation: {
      /**
       * **Stages nothing, and says so** (D-34). There is no placeholder to
       * create, no node to detach and nothing to acquire, so the honest return
       * value is "proceed".
       */
      prepare() {
        return true;
      },

      /** Strict I-30 order: register, make visible, publish, then notify. */
      effect(current, _prepared, scope) {
        const { visual } = scope;

        // 1 → 2. Everything the later seams read that no `prepare` decides.
        rt.lift = scope.lift;
        rt.originRect = scope.originRect;
        // **Handed down, not measured** (D-72, D-85). The inverse inherited
        // linear part is what turns a viewport delta into `localDelta` with
        // four multiplies and no coordinate module — and this behavior now
        // performs **no** DOM read per activation, because the kernel derived
        // it from the measurement `acquireLift` took before it moved anything.
        // Reading it here would read a different ancestry: under a lifted mode
        // the visual is `position: fixed` in the top layer by now, so a second
        // traversal reports the viewport rather than the transformed stage the
        // drag actually began in.
        rt.space = scope.inheritedSpace;
        view = { realm, originRect: scope.originRect, visual };

        if (constrain !== null) {
          // **The behavior owns the events that make the rect stale; the
          // feature owns the rect** (D-70). Scroll and resize fire many times a
          // second, so this marks staleness and never resolves — the feature
          // re-reads on the next `apply`.
          //
          // `guarded`, not `host.fail`: a native scroll listener is not a seam,
          // so a classified failure raised here would be downgraded to a
          // platform report anyway. Unlike the sortable's equivalent there is
          // no third action tag to re-raise it through — 07 fixes
          // `actionTags: 2` — and `invalidate()` is contractually a staleness
          // flag rather than a resolve, so the throw it would report is a
          // defect in a constraint rather than in consumer data.
          invalidate(scope.motion.signal, () => {
            guarded(invalidateConstraint!);
          });
        }

        // **The policy read** (D-71): the `axis` source is read at activation,
        // never per sample. Consumer code, inside a seam, so a throw is
        // `FAILURE_ACTIVATION` → `interaction`.
        if (typeof slots.axis === 'function') {
          rt.axis = slots.axis();

          // The terminal barrier: a source that destroyed its own controller
          // must not have `onStart` called after `destroy()` returned.
          if (host.closed) {
            return;
          }
        }

        // 3 — the visual is placed at the delta the pointer has already
        // accumulated. **Parity: no jump on the first move after activation.**
        // The threshold crossing is what activates, so the pointer is already
        // some distance from the grab; leaving the visual at zero until the
        // next sample would show that distance as a jump.
        deriveMotion(
          current.pointerX,
          current.pointerY,
          current.originX,
          current.originY,
          current.offsetX,
          current.offsetY,
        );

        // **The last barrier of the activation sequence** (I-36, E-02), and the
        // one the terminal table claimed and the code did not have. The check
        // above covers the `axis` source; `deriveMotion` then calls
        // `constrain.apply`, which reaches a third-party constraint and — with
        // `bounds()` installed — the consumer's own rect source. So this is the
        // reading owed *after the last consumer-reachable call and before the
        // first thing that survives it*: the lift write, the progress advance
        // and `onStart` are all on the far side of it.
        //
        // The two readings are not redundant. Dropping the first would call a
        // third-party `constrain.apply` after `destroy()`; dropping this one
        // publishes a start for a controller the consumer already closed.
        if (host.closed) {
          return;
        }

        scope.lift.write(motion.x, motion.y);

        // **The marker advances before the call, not after** (D-66). A throw
        // from `onStart` is classified, and the consumer has by then been told
        // the drag began — so it is owed an end.
        progress = STARTED;

        // 4 — last, because it may reentrantly cancel or destroy.
        if (slots.onStart !== null) {
          slots.onStart(
            buildGeometry(
              current.pointerX,
              current.pointerY,
              current.originX,
              current.originY,
              motion.x,
              motion.y,
              scope.originRect,
              rt.space,
              realm,
            ),
          );
        }
      },
    },

    // -----------------------------------------------------------------------
    // The hot path
    // -----------------------------------------------------------------------

    /**
     * Raw delta from the committed sample plus the frame's offset, axis, the
     * constraint when installed, the write — and **then** `onMove`, which is the
     * shipped observable and is retained (07 §The seam mapping).
     */
    moved(current, lift) {
      deriveMotion(
        current.pointerX,
        current.pointerY,
        current.originX,
        current.originY,
        current.offsetX,
        current.offsetY,
      );
      lift.write(motion.x, motion.y);

      // The latch is read **before** the one consumer call in this seam (I-36).
      // The geometry object is built inside the branch: a composition with no
      // `onMove` pays no allocation and no derived rect per sample, which is
      // what keeping the slot nullable rather than normalizing it buys.
      if (slots.onMove !== null && !host.closed) {
        slots.onMove(
          buildGeometry(
            current.pointerX,
            current.pointerY,
            current.originX,
            current.originY,
            motion.x,
            motion.y,
            rt.originRect!,
            rt.space,
            realm,
          ),
        );
      }
    },

    // -----------------------------------------------------------------------
    // Behavior actions — the two D-71 mints
    // -----------------------------------------------------------------------

    action: {
      prepare(tag, argument, draft) {
        // **Per-tag phase legality** (D-86, E-04). Free drag owns writable
        // geometry in exactly two phases: `ACTIVATING`, so a `moveTo()` from
        // `onStart` retargets rather than being dropped, and `ACTIVE`. From
        // `RELEASING` on the kernel's own vocabulary says *input closed,
        // geometry final* — the request is built, the landing origin is about
        // to be sampled, and `BehaviorLiftSession` already declares a write
        // after that point out of contract.
        //
        // **The two tags share the set and not the reason**, which is why the
        // comparison is written once here and the reasons are recorded per tag
        // in 07 §Action phase legality. `TAG_POSITION` is refused for
        // correctness: from `onEnd` it is FIFO-ahead of `RETIRE`, so it writes
        // through an already-disposed lift and leaves a stray inline transform
        // on a released element. `TAG_POLICY` is refused for hygiene: it writes
        // no geometry, but it re-enters the `axis` source and a third-party
        // `constrain.invalidate()` when no later sample exists to be affected.
        // They coincide today only because free drag takes no sample after
        // release.
        //
        // **A no-op, not a rejection.** `null` is this seam's existing discard
        // value, so a late `moveTo()` costs one comparison and produces no
        // failure, no report and no terminal — a consumer calling it from
        // `onEnd` has not made an error the library should classify.
        //
        // **Not in the kernel**, deliberately: the sortable *intentionally*
        // accepts a collection `invalidate()` in these same phases, because a
        // collection change during settlement is real information and a
        // position write is not. Action legality is behavior knowledge.
        if (draft.phase !== ACTIVATING && draft.phase !== ACTIVE) {
          return null;
        }

        if (tag === TAG_POLICY) {
          // **The one site with two consumer-reachable calls in one seam**
          // (I-36, F-47, L-3), and the whole reason the barrier is read
          // *between* them rather than only before the first: `invalidate()`
          // re-reads the `axis` source and then re-resolves bounds, with the
          // behavior driving the sequence.
          const next =
            typeof slots.axis === 'function' ? slots.axis() : slots.axis;

          if (host.closed) {
            return null;
          }

          invalidateConstraint?.();

          // Staged rather than written: `prepare` decides, `effect` publishes.
          return { axis: next };
        }

        if (tag === TAG_POSITION) {
          // **`moveTo` re-bases** (D-71). The offset is chosen so the visual is
          // at `point` on the next committed frame, and later pointer motion
          // continues *relative to that* — the shipped `update({ position })`
          // set an absolute controlled position that later samples did not
          // disturb, and the two differ only when the pointer keeps moving,
          // where the re-base is the one that composes with a live pointer
          // rather than fighting it.
          //
          // It is an **input**, not a derivation, so it is a frame field and
          // only a `prepare` may write it.
          const origin = rt.originRect;

          if (origin === null) {
            return null;
          }

          const point = argument as Point;
          // **Read before anything is written** (D-91). A malformed `point` —
          // `null`, missing fields, a throwing accessor — throws *here*, at the
          // read, and reaches `FAILURE_ACTION_PREPARE` → `presentation`
          // naturally. It is deliberately not checked: that is argument
          // validation, and the seam already classifies it.
          const { x, y } = point;

          // **Finiteness is not checked** (D-124, superseding D-91's added
          // check). `controller.d.ts` publishes _both coordinates must be
          // finite_ on `moveTo`'s own doc comment, so a non-finite one is
          // outside the contract and the reachability gate closes before
          // ownership is asked. What the offsets then poison — `deriveMotion`,
          // every geometry object, the pinned `anchorTarget`, and through
          // `LandingContext.from` the library-minted `distance` — is the
          // undefined behaviour that misuse buys, not a second harm that makes
          // it the library's.
          draft.offsetX = x - origin.left - (draft.pointerX - draft.originX);
          draft.offsetY = y - origin.top - (draft.pointerY - draft.originY);

          return true;
        }

        return null;
      },

      effect(tag, _argument, current, prepared) {
        if (tag === TAG_POLICY) {
          rt.axis = (prepared as Readonly<{ axis: DragAxis }>).axis;
          return;
        }

        // **Rendered from an `action.effect`**, which is 13c N-4's route: there
        // is no way to make the kernel emit a `moved` for a position it did not
        // sample, so the write happens here — after the commit, from the
        // committed offset.
        deriveMotion(
          current.pointerX,
          current.pointerY,
          current.originX,
          current.originY,
          current.offsetX,
          current.offsetY,
        );
        rt.lift?.write(motion.x, motion.y);
      },
    },

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------

    release: {
      prepare(draft) {
        const { visual } = draft;
        const origin = rt.originRect;

        // **Never `invoke: null`** (07): free drag has no proven semantic
        // no-op, so `SETTLED_SKIPPED` has no producer in this behavior. A
        // release that finds no visual has a broken invariant, and reporting it
        // as a successful no-op drop would tell the consumer the drag completed
        // normally.
        if (visual === null || origin === null) {
          return rejection(
            FAILURE_RELEASE,
            'drag: free-drag/release-no-visual',
          );
        }

        deriveMotion(
          draft.pointerX,
          draft.pointerY,
          draft.originX,
          draft.originY,
          draft.offsetX,
          draft.offsetY,
        );

        const request = buildRequest(
          subjectOf(visual),
          draft.pointerX,
          draft.pointerY,
          motion.x,
          motion.y,
          origin,
          rt.space,
          realm,
        );

        // **The terminal barrier on the frame write** (I-36, I-20). The only
        // consumer-reachable call above is a `bounds` source inside
        // `constrain.apply`; the request pins the item, the visual and a rect
        // in a frame teardown has already scrubbed and will not scrub again.
        // The command is still returned rather than nulled — `invoke: null`
        // asserts a proven no-op, and the kernel already refuses to run a
        // staged command for an invalidated preparation.
        if (!host.closed) {
          draft.request = request;
        }

        return {
          invoke: (signal) => {
            // **First statement of the closure** (D-66). The kernel runs this
            // only after `release.effect` returns normally, so reaching it is
            // proof the consumer's resolver is being invoked — which is what
            // makes a later failure `AT_CONSUMER` rather than `AT_PROPOSAL`.
            progress = RESOLVING;
            return slots.onDrop(request, { signal });
          },
        };
      },

      /**
       * ~~Nothing — there is no placeholder to move.~~ **There is no
       * placeholder, and there is still one write** (F-39, applied to this
       * behavior). `pointerup` need not carry the last processed
       * `pointermove`'s coordinates, and the request above was built from the
       * *committed release point* — so without this the visual, and therefore
       * the whole landing trajectory, would start from a stale position while
       * `anchorTarget` reports the fresh one. That is precisely the wrong-start
       * signature D-35 exists to prevent, arriving through the other end.
       *
       * `motion` still holds the release delta `prepare` derived, and nothing
       * between the two phases can have changed it.
       */
      effect() {
        // The terminal barrier on the write: `retire()` nulls `rt.lift`, so
        // without this the next line is `null.write(…)` on a controller that no
        // longer exists.
        if (host.closed) {
          return;
        }

        rt.lift?.write(motion.x, motion.y);
      },
    },

    // -----------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------

    settlement: {
      /** The five-case mapping, covered exhaustively (D-24, F-29). */
      prepare(draft, input): PreparedSettlement | SeamRejection {
        pendingFailure = null;

        const { request } = draft;

        // No `default`, deliberately: an exhaustive switch over the
        // discriminant is what makes a new settlement case a *compile* error
        // here rather than a silent fall-through to some plausible outcome.
        // oxlint-disable-next-line default-case
        switch (input.type) {
          case SETTLED_SKIPPED: {
            // **No producer in this behavior** (07 §What free drag does not
            // have): `release.prepare` never returns `invoke: null`. Reaching
            // it means the kernel skipped a round-trip this behavior never
            // declined, which is a broken invariant rather than a drop.
            return rejection(
              FAILURE_RESOLUTION,
              'drag: free-drag/settled-skipped',
            );
          }

          case SETTLED_FULFILLED: {
            const { value } = input;

            if (!isFreeDragResolution(value)) {
              return rejection(
                FAILURE_RESOLUTION,
                'drag: free-drag/drop-resolution-invalid',
              );
            }

            // **Every read of the consumer's resolution before any write**
            // (I-36). `isFreeDragResolution` is a duck-type test on `.type`, so
            // both `type` and `reason` are accessors on an object the consumer
            // built and either may destroy the controller. The domain value is
            // a local until the barrier passes.
            const domain: FreeDragTransactionResult =
              value.type === 'accepted'
                ? { type: 'accepted', request: request! }
                : {
                    type: 'rejected',
                    request: request!,
                    reason: value.reason,
                  };

            if (host.closed) {
              return true;
            }

            draft.domain = domain;

            return true;
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict, so it is a named classified failure rather than
            // an inferred rejection. It still *ends* the operation — D-66 — but
            // as a fault reported through `onError`, with the terminal saying
            // `canceled` rather than `rejected`.
            return { stage: FAILURE_RESOLUTION, error: input.error };
          }

          case SETTLED_CANCELED: {
            draft.domain = {
              type: 'canceled',
              request,
              reason: input.reason,
              stage: input.stage,
            };

            return true;
          }

          case SETTLED_FAILED: {
            pendingFailure = { stage: input.stage, error: input.error };

            // A terminal-callback failure arrives *after* the operation
            // finalized, so rewriting the result now would relabel a drop that
            // has already been reported.
            if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
              // **Existing result wins, otherwise `canceled`** — the whole of
              // D-66's carrier, as a lookup on the frame rather than a branch
              // per stage. `beginFrame` is `Object.assign(draft, current)`, so
              // a settlement that already committed a result arrives here still
              // carrying it, and `??=` is the tie-break.
              //
              // **The marker decides the stage, and it also decides whether to
              // publish at all.** At `MINTED` the consumer never heard this
              // drag start, and an end for a beginning it has no record of is
              // worse than no end.
              draft.domain ??=
                progress === MINTED
                  ? null
                  : {
                      type: 'canceled',
                      request,
                      reason: input.error,
                      stage: progress === RESOLVING ? AT_CONSUMER : AT_PROPOSAL,
                    };
            }

            return true;
          }
        }
      },

      effect(current, _prepared, scope) {
        const failure = pendingFailure;

        pendingFailure = null;

        // **The gate is held only when the visual has to travel** (07 §The seam
        // mapping). An accepted drop stays where it landed — `anchorTarget`
        // returns the position it is already at — so holding a gate for it
        // would animate a zero-length trajectory and delay the terminal for
        // nothing. Rejected and canceled arms return to a home, configured or
        // the grab spot, and that is a real journey.
        //
        // A `null` domain is the D-66 no-start case; treated as travelling,
        // because the visual is somewhere the consumer never sanctioned.
        if (
          failure === null &&
          slots.startLanding !== null &&
          current.domain?.type !== 'accepted'
        ) {
          scope.holdForLanding(slots.startLanding);
        }

        // Consumer callbacks last. A failed settlement reports through
        // `onError` here **and** publishes its terminal from the failure path's
        // own step (D-66) — the two channels are orthogonal and neither
        // suppresses the other.
        if (failure !== null) {
          // D-64: the consumer branches on a fault class, never on a stage.
          slots.onError?.(toDraggableError(failure.stage, failure.error), {
            domain: current.domain,
          });
        }
      },
    },

    // -----------------------------------------------------------------------
    // Landing target and the terminal callback
    // -----------------------------------------------------------------------

    /**
     * Accepted → where the visual already is. Rejected or canceled → `home`, or
     * the grab position when none is configured.
     *
     * **A throwing or non-finite `home` is an error, not a cancel** — the
     * shipped semantics. The kernel runs this on the *quality* track
     * (`FAILURE_LANDING_TARGET` → `presentation`), so the landing is skipped
     * rather than faked and a drop that already committed is not re-settled
     * (D-49).
     */
    anchorTarget(current): Point {
      const origin = rt.originRect!;

      if (current.domain?.type === 'accepted' || slots.getHome === null) {
        // The accepted arm, and the unconfigured-home arm, answer from
        // arithmetic the frame already holds — no consumer call and no DOM
        // read. For the accepted arm that is the visual's current position; for
        // the other it is the grab position, which is the origin rect itself.
        if (current.domain?.type !== 'accepted') {
          return { x: origin.left, y: origin.top };
        }

        // **Read, not re-derived** (D-89, CE1-02). This arm used to call
        // `deriveMotion`, whose last statement is `constrain.apply` — so the
        // comment above was false whenever any constraint was installed, and
        // the seam was a **fifth** `apply` site, absent from I-36's Category-1
        // table and from D-81's re-derived four-seam enumeration. It also had
        // no barrier of its own: `host.closed` is read immediately before
        // `home` below and nowhere before the derivation, so a third-party
        // `apply` ran after logical closure while the resolver beside it was
        // guarded — E-02's shape, one seam further on.
        //
        // The re-derivation computed the same numbers from the same committed
        // frame, so removing it makes all three documents true at once and
        // costs nothing. **The invariant it rests on is stated rather than
        // assumed**: `motion` still holds the delta `release.prepare` derived
        // and `release.effect` wrote, and nothing may change it in between —
        // which is what D-86 guarantees by making both behavior tags
        // deterministic no-ops after `ACTIVE`.
        return { x: origin.left + motion.x, y: origin.top + motion.y };
      }

      // The terminal barrier before the one consumer call (I-36). The kernel
      // revalidates around `anchorTarget` and never starts a landing for a
      // destroyed controller; what this stops is the call itself.
      if (host.closed) {
        return { x: origin.left, y: origin.top };
      }

      const home = slots.getHome(subjectOf(current.visual!));
      // **Read, checked and copied here, inside the attributed seam** (E-05,
      // D-49). The kernel's quality wrapper covers *this call* and reads the
      // point's fields later, outside it — so a `null`, a missing field or a
      // throwing accessor used to panic outside the seam its own contract
      // names, and a non-finite pair reached target composition or a renderer.
      //
      // **The reads stay; the finiteness throw is gone** (D-124). A `null`, a
      // missing field or a throwing accessor still fails *here*, inside the
      // seam whose track is already published (07 §Validation):
      // `FAILURE_LANDING_TARGET` →
      // `presentation`, on the **quality** route, so the landing is skipped
      // rather than faked and a drop that already committed is not re-settled.
      // A non-finite pair is no longer refused: a landing target is a point,
      // and a point's coordinates are finite by the same obvious semantics
      // that makes a duration finite, so that value is outside the contract
      // and the gate closes on it.
      //
      // **The copy is not defensiveness and does not go with the throw**: the
      // returned object is consumer-owned and its accessors may be live, so
      // composing against it twice could read two different points. That is
      // the library taking ownership of a value it reads across a seam
      // boundary and pins geometry with — `CODE_OF_SIZE.md` §1.1's explicit
      // carve-out, and a getter-backed `Point` is a legitimate shape rather
      // than misuse.
      const { x } = home;
      const { y } = home;

      return { x, y };
    },

    /**
     * **It publishes `current.domain` and nothing else** (D-62, D-66). The arms
     * are the consumer's to discriminate; with one `onEnd` there is no routing
     * predicate to get wrong.
     *
     * `null` means one thing only: the operation failed **before** `onStart`
     * ran, so the consumer has no record of it beginning.
     */
    finalized(current) {
      const { domain } = current;

      if (domain !== null) {
        slots.onEnd?.(domain);
      }
    },

    /**
     * The un-classified report channel, for both of its callers: `admit` threw
     * and no identity was ever minted (Q-1), or the landing measurement failed
     * on a drop that already committed (D-49), in which case an operation is
     * live, its result stands, and its terminal publishes after this returns.
     *
     * `domain: null` for both — the hook is handed no frame, so this callback
     * cannot see the result the second caller's operation carries. The non-null
     * case comes from the settlement failure path, which reports with the frame
     * in hand.
     */
    reportFailure(stage, error) {
      slots.onError?.(toDraggableError(stage, error), { domain: null });
    },

    retire() {
      progress = MINTED;
      rt.lift = null;
      rt.originRect = null;
      rt.space = null;
      view = null;

      // Already in reverse installation order. Each is wrapped individually, so
      // one throwing hook cannot stop a later one from releasing what it holds.
      for (const hook of slots.retireHooks) {
        guarded(hook);
      }
    },
  };
}
