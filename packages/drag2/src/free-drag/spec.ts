/**
 * Every free-drag seam, as closures over one private runtime.
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 *
 * **`Activation` is `true`.** Free drag stages nothing at activation — no
 * placeholder, no detached node, no acquired resource — so a pinned
 * `HTMLElement` staging type would force its `prepare` to return
 * `scope.visual`, an element the kernel already holds, with `effect` ignoring
 * what it was handed: the staged-resource contract inverted.
 */
import {
  type DraggableError,
  DraggableWarning,
  type Notify,
} from '../kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_FAILED,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import { pathOwnsInteraction } from '../kernel/input-policy.ts';
import { createInvalidator } from '../kernel/invalidation.ts';
import { ACTIVATING, ACTIVE } from '../kernel/phases.ts';
import type { PointCache } from '../kernel/point-cache.ts';
import type {
  BehaviorLiftSession,
  InheritedSpace,
} from '../kernel/presentation.ts';
import {
  type BehaviorSpec,
  type KernelHost,
  type PreparedSettlement,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
} from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import { createUnwind } from '../kernel/unwind.ts';
import {
  ACCEPTED,
  type FreeDragSubject,
  type RejectedResolution,
} from './domain.ts';
import type { ConstraintView, MotionDraft } from './feature.ts';
import { type FreeDragFramePart, freeDragFramePart } from './frames.ts';
import { applyAxis, buildGeometry, buildRequest } from './geometry.ts';
import { FREE_DRAG_ACTION_TAGS, TAG_POLICY, TAG_POSITION } from './runtime.ts';
import type { FreeDragSlots } from './slots.ts';

/**
 * The three states of the progress marker, module-private because they are
 * behavior-internal: nothing outside this file may read how far an operation
 * got, and nothing in the kernel could interpret it if it did.
 */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

export function createFreeDragSpec(
  host: KernelHost,
  slots: FreeDragSlots,
): BehaviorSpec<FreeDragFramePart> {
  const { realm, root } = host;

  /**
   * **Per-operation state, as spec locals.** These three, plus `view`,
   * `progress` and `pendingFailure` beside them, are all cleared in `retire()`,
   * so an idle controller pins nothing from the drag it just finished.
   */
  let lift: BehaviorLiftSession | null = null;
  /** The visual's viewport rect at grab. The basis of every clamp and rect. */
  let originRect: DOMRectReadOnly | null = null;
  /**
   * The inherited linear part's inverse, **handed down by the kernel** from the
   * one pre-lift measurement. Capturing it here would take a second traversal,
   * after acquisition has already moved the visual.
   */
  let space: InheritedSpace = null;
  /**
   * **The one place this behavior invokes the consumer's error callback.** Both
   * routes below end here, so there is exactly one statement to find when
   * asking *where does `onError` get called*.
   *
   * Unguarded and ungated on purpose: its two callers apply those rules, and
   * they apply them differently — `panic`'s delivery is a named exception to
   * the latch, which is impossible if the latch is read here.
   */
  const deliver: Notify = (error) => {
    slots.onError?.(error);
  };

  /**
   * **The behavior's own route to the one channel.**
   *
   * Two callers reach {@link deliver} and they are two entries to one channel
   * rather than two channels: everything that arrives is a `DraggableError` or
   * a `DraggableWarning`, and neither entry encodes severity. The kernel's
   * `notify` covers what the *kernel* reports, because it owns the latch. This
   * covers what the *behavior* reports — the settlement failure below and the
   * unwind steps, which the kernel cannot see.
   *
   * Both apply the same two rules. The latch refuses a declared consumer slot
   * after logical closure, and a throw from the handler stops here rather than
   * being reported through itself.
   */
  const notify: Notify = (error) => {
    if (host.closed) {
      return;
    }

    try {
      deliver(error);
    } catch {
      // The terminus, for the same reason the kernel's channel has one.
    }
  };
  const unwind = createUnwind(notify);

  // One per controller. Arming is per operation, on the motion signal.
  const invalidate = createInvalidator(realm);

  /**
   * **How far the operation got, as one monotone marker.** Per operation,
   * cleared in `retire()`. It exists because the failure path owes a terminal
   * and the kernel cannot supply the two facts that decide which one: *did the
   * consumer hear this drag start*, and *was its resolver actually invoked*.
   * Both are behavior knowledge.
   */
  let progress = MINTED;

  /**
   * The failure the open settlement seam is reporting, handed from `prepare` to
   * `effect` because `PreparedSettlement` carries only the gate declaration —
   * the same accepted out-of-band channel the sortable uses, safe for the same
   * reason: `prepare` clears the slot on entry, so a value can only ever be
   * read by the effect of the transaction whose prepare wrote it.
   */
  let pendingFailure: Readonly<{
    stage: FailureStage;
    report: DraggableError;
  }> | null = null;

  /**
   * **One scratch draft per controller, written in place.** The constraint
   * writes clamped scalars back into this object rather than returning a
   * `Point`, so the per-sample path allocates nothing — which is the whole
   * reason `MotionConstraint.apply` has the shape it has.
   */
  const motion: MotionDraft = { x: 0, y: 0 };
  /**
   * **The landing target's return buffer, one per controller.** Every
   * `anchorTarget` arm writes these two fields and returns this object; the
   * kernel reads them immediately and retains nothing, which is the borrow the
   * seam's own contract states. Never module-level: two controllers on one page
   * must not share one. Nothing may read it between calls.
   */
  const anchor: PointCache = { x: 0, y: 0 };
  /** Built once per operation, in `activation.effect`. */
  let view: ConstraintView | null = null;

  /**
   * **`apply` and `invalidate`, lifted once here.** `retire` is not one of them
   * — the assembler lifts that one and owns both its call sites.
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
  const { axis, constrain } = slots;
  const applyConstraint = constrain ? constrain.apply : null;
  const invalidateConstraint = constrain ? constrain.invalidate : null;

  /**
   * The rendered delta, derived rather than stored. It is a pure function of
   * the committed sample, the frame's offset and the policy, so every reader
   * derives it and none mirrors the kernel's own record.
   *
   * Writes into `motion` and returns nothing: a `Point` return would put an
   * allocation on the hot path for a value three of the four callers
   * immediately destructure.
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
    // **Core, not a capability**: two comparisons and no state.
    applyAxis(motion, axis);
    // **One indirect call, only when something filled the slot.** A composition
    // without `bounds()` pays one property read and one predictable branch, and
    // carries no clamp arithmetic and no rect resolver at all.
    applyConstraint?.(motion, view!);
  };

  /** The subject `home` is asked about, and the request carries. */
  const subjectOf = (visual: HTMLElement): FreeDragSubject => ({
    item: root,
    visual,
  });

  return {
    createFramePart: freeDragFramePart,
    // **One function fills both slots**: called with no argument it allocates a
    // part at its defaults, called with one it returns that part to them. The
    // reset's return is the part it was handed, which the kernel has and
    // ignores.
    // eslint-disable-next-line @typescript-eslint/strict-void-return
    resetFramePart: freeDragFramePart,

    config: {
      threshold: slots.threshold,
      liftMode: slots.liftMode,
      actionTags: FREE_DRAG_ACTION_TAGS,
    },

    // -----------------------------------------------------------------------
    // Admission — inside the native `pointerdown` dispatch
    // -----------------------------------------------------------------------

    /**
     * The input policy and the handle scoping, then the visual resolver.
     * Returns **a bare element**, because free drag has no separate geometry
     * source: there is no placeholder, so nothing measures a footprint and
     * `box === visual` is not a choice being repeated.
     *
     * **The item is `root`.** `freeDrag(item, …)` passes the item as the
     * ingress boundary, so the ingress root and the dragged item are the same
     * element by construction rather than by lookup — which is why there is no
     * composed-path search here and no collection to search.
     */
    admit(event, draft) {
      // **A modifier requests native text selection; its absence means drag**
      // One branch, no state, no disambiguation window.
      if (event.altKey) {
        return null;
      }

      const path = event.composedPath();
      let subject = path.indexOf(root);

      if (subject === -1) {
        return null;
      }

      if (slots.handle) {
        const handle = slots.handle(root);

        // **The terminal barrier on the admission sequence.** `handle` is
        // consumer code and `visual` is called right after it returns, so a
        // handle resolver that destroyed the controller would otherwise have a
        // second consumer resolver called after `destroy()` returned.
        //
        // It **declines**, it does not throw: a throw reaches
        // `reportFailure(FAILURE_ADMISSION)` and would tell the consumer that
        // its own `destroy()` was a library failure.
        if (host.closed || !handle) {
          return null;
        }

        // **The resolved subject governs.** A handle inside the item sits
        // earlier in the composed path, so scoping to it shortens the segment
        // the opt-out scan walks — and a handle inside a marked region admits,
        // because the consumer scoped dragging there on purpose.
        subject = path.indexOf(handle);

        if (subject === -1) {
          return null;
        }
      }

      // **What did the event land on**, asked after the subject is known and
      // before anything is seeded. A press reaching a `[data-drag-ignore]`
      // region declines by the ordinary total-decline path: no operation, no
      // phase change, and — since the kernel prevents nothing for a `null` —
      // focus lands and the caret places.
      if (pathOwnsInteraction(path, subject)) {
        return null;
      }

      let visual = root;

      if (slots.visual) {
        visual = slots.visual(root);

        // The terminal barrier on the visual resolver. `runAdmission`
        // revalidates after this whole callback and declines the operation, but
        // it does not scrub the draft it declined — so without this the write
        // below would pin the visual in an inactive frame nothing clears again.
        if (host.closed) {
          return null;
        }
      }

      draft.visual = visual;

      return visual;
    },

    /**
     * **No `command` member.** Free drag has no discrete ingress: `arm()` binds
     * `pointerdown` and nothing else. Keyboard free drag has no counterpart in
     * `@ydinjs/drag`, so it is not invented here.
     */

    // -----------------------------------------------------------------------
    // Activation
    // -----------------------------------------------------------------------

    activation: {
      /**
       * **Stages nothing, and says so.** There is no placeholder to create, no
       * node to detach and nothing to acquire, so the honest return value is
       * "proceed".
       */
      prepare() {
        return true;
      },

      /** Strict order: register, make visible, publish, then notify. */
      effect(current, _prepared, scope) {
        const { visual } = scope;

        // 1 → 2. Everything the later seams read that no `prepare` decides.
        ({ lift, originRect } = scope);
        // **Handed down, not measured.** The inverse inherited linear part is
        // what turns a viewport delta into the local one, with four multiplies
        // written out where the two consumer shapes are built and no coordinate
        // module — and this behavior performs **no** DOM read per activation,
        // because the kernel derived it from the measurement `acquireLift` took
        // before it moved anything. Reading it here would read a different
        // ancestry: under a lifted mode the visual is `position: fixed` in the
        // top layer by now, so a second traversal reports the viewport rather
        // than the transformed stage the drag actually began in.
        space = scope.visualSpace;
        view = { realm, originRect: scope.originRect, visual };

        if (constrain) {
          // **The behavior owns the events that make the rect stale; the
          // feature owns the rect.** Scroll and resize fire many times a
          // second, so this marks staleness and never resolves — the feature
          // re-reads on the next `apply`.
          //
          // A local `try`/`catch`, not `unwind` and not `host.fail`. **Nothing
          // is pending**: this is one call at the end of a native listener, so
          // no later statement is load-bearing and the shared unwind helper
          // would be naming a rule this site does not have.
          //
          // Not `host.fail` because a native scroll listener is not a seam, so
          // a classified failure raised here would be refused anyway. Unlike
          // the sortable's equivalent there is no third action tag to re-raise
          // it through — this behavior declares `actionTags: 2` — and
          // `invalidate()` is contractually a staleness flag rather than a
          // resolve, so the throw it would report is a defect in a constraint
          // rather than in consumer data.
          invalidate(scope.motion.signal, () => {
            try {
              invalidateConstraint!();
            } catch (error: unknown) {
              notify(
                new DraggableWarning('drag: constraint/invalidate-failed', {
                  cause: error,
                }),
              );
            }
          });
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

        // **The last barrier of the activation sequence.** `deriveMotion` calls
        // `constrain.apply`, which reaches a third-party constraint and — with
        // `bounds()` installed — the consumer's own rect source. So this is the
        // reading owed *after the last consumer-reachable call and before the
        // first thing that survives it*: the lift write, the progress advance
        // and `onStart` are all on the far side of it.
        //
        // **It is the only reading in this seam**: `axis` is fixed, so it is
        // read from the slot record without entering consumer code at all.
        if (host.closed) {
          return;
        }

        scope.lift.write(motion.x, motion.y);

        // **The marker advances before the call, not after.** A throw from
        // `onStart` is classified, and the consumer has by then been told the
        // drag began — so it is owed an end.
        progress = STARTED;

        // 4 — last, because it may reentrantly cancel or destroy.
        if (slots.onStart) {
          slots.onStart(
            buildGeometry(
              current.pointerX,
              current.pointerY,
              current.originX,
              current.originY,
              motion.x,
              motion.y,
              scope.originRect,
              space,
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
     * constraint when installed, the write — and **then** `onMove`, so the
     * callback observes a visual that has already moved.
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

      // The latch is read **before** the one consumer call in this seam. The
      // geometry object is built inside the branch: a composition with no
      // `onMove` pays no allocation and no derived rect per sample, which is
      // what keeping the slot nullable rather than normalizing it buys.
      if (slots.onMove && !host.closed) {
        slots.onMove(
          buildGeometry(
            current.pointerX,
            current.pointerY,
            current.originX,
            current.originY,
            motion.x,
            motion.y,
            originRect!,
            space,
            realm,
          ),
        );
      }
    },

    // -----------------------------------------------------------------------
    // Behavior actions — the two mints
    // -----------------------------------------------------------------------

    action: {
      prepare(tag, argument, draft) {
        // **Per-tag phase legality.** Free drag owns writable geometry in
        // exactly two phases: `ACTIVATING`, so a `moveTo()` from `onStart`
        // retargets rather than being dropped, and `ACTIVE`. From `RELEASING`
        // on the kernel's own vocabulary says *input closed, geometry final* —
        // the request is built, the landing origin is about to be sampled, and
        // `BehaviorLiftSession` already declares a write after that point out
        // of contract.
        //
        // **The two tags share the set and not the reason**, which is why the
        // comparison is written once here. `TAG_POSITION` is refused for
        // correctness: from `onEnd` it is FIFO-ahead of `RETIRE`, so it writes
        // through an already-disposed lift and leaves a stray inline transform
        // on a released element. `TAG_POLICY` is refused for hygiene: it writes
        // no geometry, but it re-enters a third-party `constrain.invalidate()`
        // when no later sample exists to be affected. They coincide today only
        // because free drag takes no sample after release.
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
          // **One consumer-reachable call, and nothing to publish.**
          // `invalidate()` is a staleness flag: the constraint re-resolves on
          // its own next `apply`, so there is no staged value, no commit and no
          // `effect` branch. Nothing follows the call in this seam, so there is
          // no closure barrier to read after it.
          invalidateConstraint?.();

          return null;
        }

        if (tag === TAG_POSITION) {
          // **`moveTo` re-bases.** The offset is chosen so the visual is at
          // `point` on the next committed frame, and later pointer motion
          // continues *relative to that*, which composes with a live pointer
          // rather than fighting it.
          //
          // It is an **input**, not a derivation, so it is a frame field and
          // only a `prepare` may write it.
          const origin = originRect;

          if (!origin) {
            return null;
          }

          const point = argument as Point;
          // **Read before anything is written.** A malformed `point` — `null`,
          // missing fields, a throwing accessor — throws *here*, at the read,
          // and is classified `FAILURE_ACTION_PREPARE` naturally. It is
          // deliberately not checked: that is argument validation, and the seam
          // already classifies it.
          const { x, y } = point;

          // **Finiteness is not checked.** `moveTo`'s own doc comment publishes
          // _both coordinates must be finite_, so a non-finite one is outside
          // the contract and the reachability gate closes before ownership is
          // asked. What the offsets then poison — `deriveMotion`, every
          // geometry object, the pinned `anchorTarget`, and through
          // `LandingContext.from` the library-minted `distance` — is the
          // undefined behaviour that misuse buys, not a second harm that makes
          // it the library's.
          draft.offsetX = x - origin.left - (draft.pointerX - draft.originX);
          draft.offsetY = y - origin.top - (draft.pointerY - draft.originY);

          return true;
        }

        return null;
      },

      effect(_tag, _argument, current) {
        // **Rendered from an `action.effect`**: there is no way to make the
        // kernel emit a `moved` for a position it did not sample, so the write
        // happens here — after the commit, from the committed offset.
        deriveMotion(
          current.pointerX,
          current.pointerY,
          current.originX,
          current.originY,
          current.offsetX,
          current.offsetY,
        );
        lift?.write(motion.x, motion.y);
      },
    },

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------

    release: {
      prepare(draft) {
        const { visual } = draft;
        const origin = originRect;

        // **Never `invoke: null`**: free drag has no proven semantic no-op, so
        // `SETTLED_SKIPPED` has no producer in this behavior. A release that
        // finds no visual has a broken invariant, and reporting it as a
        // successful no-op drop would tell the consumer the drag completed
        // normally.
        if (!visual || !origin) {
          throw new Error('drag: free-drag/release-no-visual');
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
          space,
          realm,
        );

        // **The terminal barrier on the frame write.** The only
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
            // **First statement of the closure.** The kernel runs this only
            // after `release.effect` returns normally, so reaching it is proof
            // the consumer's resolver is being invoked — which is what makes a
            // later failure `AT_CONSUMER` rather than `AT_PROPOSAL`.
            progress = RESOLVING;
            return slots.onDrop(request, { signal });
          },
        };
      },

      /**
       * **There is no placeholder, and there is still one write.** `pointerup`
       * need not carry the last processed `pointermove`'s coordinates, and the
       * request above was built from the *committed release point* — so without
       * this the visual, and therefore the whole landing trajectory, would
       * start from a stale position while `anchorTarget` reports the fresh one.
       *
       * `motion` still holds the release delta `prepare` derived, and nothing
       * between the two phases can have changed it.
       */
      effect() {
        // The terminal barrier on the write: `retire()` nulls `lift`, so
        // without this the next line is `null.write(…)` on a controller that no
        // longer exists.
        if (host.closed) {
          return;
        }

        lift?.write(motion.x, motion.y);
      },
    },

    // -----------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------

    settlement: {
      /** The five-case mapping, covered exhaustively. */
      prepare(draft, input): PreparedSettlement {
        pendingFailure = null;

        const { request } = draft;

        // No `default`, deliberately: an exhaustive switch over the
        // discriminant is what makes a new settlement case a *compile* error
        // here rather than a silent fall-through to some plausible outcome.
        // oxlint-disable-next-line default-case
        switch (input.type) {
          case SETTLED_SKIPPED: {
            // **No producer in this behavior**: `release.prepare` never returns
            // `invoke: null`. Reaching it means the kernel skipped a round-trip
            // this behavior never declined, which is a broken invariant rather
            // than a drop.
            throw new Error('drag: free-drag/settled-skipped');
          }

          case SETTLED_FULFILLED: {
            const { value } = input;

            // **The resolution is the library's own value, not the
            // consumer's**: `accept()` returns a shared sentinel and `reject()`
            // a one-slot carrier, so this is an identity comparison and a plain
            // data read. There is nothing to validate — a value that is neither
            // came from outside the types.
            const accepted = value === ACCEPTED;

            // **The barrier stands for the round trip, not for this seam.**
            // Nothing between this seam's entry and the write reaches consumer
            // code, but the round trip is a `PromiseLike`: the consumer may
            // have destroyed the controller while it was pending, and the
            // request pins the item, the visual and a rect in a frame teardown
            // has already scrubbed.
            if (host.closed) {
              return true;
            }

            draft.domain = accepted
              ? { type: 'accepted', request: request! }
              : {
                  type: 'rejected',
                  request: request!,
                  reason: (value as RejectedResolution)[0],
                };

            return true;
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict, so it is a named classified failure rather than
            // an inferred rejection. It still *ends* the operation, but as a
            // fault reported through `onError`, with the terminal saying
            // `canceled` rather than `rejected`.
            //
            // **The caught cause travels verbatim.** Something *was* caught
            // here — the consumer's own rejection value — so nothing is added
            // to it: no identity, no wrapper. The seam is already open at
            // `FAILURE_RESOLUTION`, so re-raising classifies it there.
            throw input.error;
          }

          case SETTLED_CANCELED: {
            draft.domain = {
              type: 'canceled',
              request,
              reason: input.reason,
              origin: input.origin,
              stage: input.stage,
            };

            return true;
          }

          case SETTLED_FAILED: {
            pendingFailure = { stage: input.stage, report: input.report };

            // A terminal-callback failure arrives *after* the operation
            // finalized, so rewriting the result now would relabel a drop that
            // has already been reported.
            if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
              // **Existing result wins, otherwise `canceled`** — a lookup on
              // the frame rather than a branch per stage. A transaction opens
              // with `Object.assign(draft, current)`, so a settlement that
              // already committed a result arrives here still carrying it, and
              // `??=` is the tie-break.
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
                      // **The one origin a behavior mints**: the kernel writes
                      // the other three onto the `SETTLED_CANCELED` input, and
                      // this arm is the fallback that gives a classified
                      // failure a terminal. `reason` still carries the caught
                      // throw; `origin` is what tells it apart from a consumer
                      // who passed an `Error` deliberately.
                      origin: CANCEL_FAILED,
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

        // **The gate is held only when the visual has to travel.** An accepted
        // drop stays where it landed — `anchorTarget` returns the position it
        // is already at — so holding a gate for it would animate a zero-length
        // trajectory and delay the terminal for nothing. Rejected and canceled
        // arms return to a home, configured or the grab spot, and that is a
        // real journey.
        //
        // A `null` domain is the no-start case; treated as travelling, because
        // the visual is somewhere the consumer never sanctioned.
        if (
          !failure &&
          slots.startLanding &&
          current.domain?.type !== 'accepted'
        ) {
          scope.holdForLanding(slots.startLanding);
        }

        // Consumer callbacks last. A failed settlement reports through
        // `onError` here **and** publishes its terminal from the failure path's
        // own step — the report is orthogonal to the terminal and neither
        // suppresses the other.
        if (failure) {
          // The error carries the stage the kernel classified with, and this
          // member neither reads it nor derives anything from it.
          //
          // Reported through `notify`, so a throwing handler stops here instead
          // of becoming a fresh library fault that reports itself back. The
          // kernel built the error, and no `domain` rides along with it:
          // `finalized` publishes that same `current.domain` to `onEnd`
          // unconditionally, so a copy here would be redundant at best and
          // **stale** at worst, since a second failure arriving between
          // `REPORTING` and `FINALIZING` moves it.
          notify(failure.report);
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
     * **A throwing or non-finite `home` is an error, not a cancel.** The kernel
     * runs this on the *quality* track, so the landing is skipped rather than
     * faked and a drop that already committed is not re-settled. **No stage is
     * attached and none is needed**: the fault is non-consequential, so it
     * reaches `onError` as a `DraggableWarning` carrying
     * `drag: landing/target-unavailable`, and a warning needs no stage to be
     * delivered.
     */
    anchorTarget(current): PointCache {
      const origin = originRect!;

      if (current.domain?.type === 'accepted') {
        // The accepted arm answers from arithmetic the frame already holds — no
        // consumer call and no DOM read. It is the visual's current position.
        //
        // **Read, not re-derived.** This arm must not call `deriveMotion`: its
        // last statement is `constrain.apply`, so the no-consumer-call claim
        // above would be false whenever any constraint is installed, and this
        // seam would become a fifth `apply` site. Such a derivation also has no
        // barrier of its own: `host.closed` is read immediately before `home`
        // below and nowhere before a derivation, so a third-party `apply` would
        // run after logical closure while the resolver beside it is guarded.
        //
        // A re-derivation computes the same numbers from the same committed
        // frame, so the read costs nothing. **The invariant it rests on is
        // stated rather than assumed**: `motion` still holds the delta
        // `release.prepare` derived and `release.effect` wrote, and nothing may
        // change it in between — both behavior tags are deterministic no-ops
        // after `ACTIVE`.
        anchor.x = origin.left + motion.x;
        anchor.y = origin.top + motion.y;

        return anchor;
      }

      // **The terminal barrier before the one consumer call, and it is the
      // second conjunct.** `host.closed` is read only when there is a call to
      // stop: the kernel revalidates around `anchorTarget` and never starts a
      // landing for a destroyed controller, so what this stops is the call
      // itself. Both failing conjuncts fall through to the same answer, which
      // is why they are one branch and not two — an unconfigured home and a
      // closed controller both land at the grab position, and the two arms were
      // byte-identical.
      if (slots.home && !host.closed) {
        const home = slots.home(subjectOf(current.visual!));
        // **Read, checked and copied here, inside the attributed seam.** The
        // kernel's quality wrapper covers *this call* and reads the point's
        // fields later, outside it — so without the reads here a `null`, a
        // missing field or a throwing accessor panics outside the seam its own
        // contract names.
        //
        // **The reads happen; finiteness is not checked.** A `null`, a missing
        // field or a throwing accessor fails *here*, inside the seam whose
        // track is published: the **quality** route, so the landing is skipped
        // rather than faked and a drop that already committed is not
        // re-settled. **No stage rides along**: the fault is non-consequential,
        // so it arrives as a `DraggableWarning` carrying
        // `drag: landing/target-unavailable`. A non-finite pair is accepted and
        // passes undetected into target composition or a renderer, and refusing
        // it here is wrong: a landing target is a point, and a point's
        // coordinates are finite by the same obvious semantics that makes a
        // duration finite, so that value is outside the contract and the gate
        // closes on it.
        //
        // **The copy is not defensiveness and is not part of that check**: the
        // returned object is consumer-owned and its accessors may be live, so
        // composing against it twice could read two different points. That is
        // the library taking ownership of a value it reads across a seam
        // boundary and pins geometry with, and a getter-backed `Point` is a
        // legitimate shape rather than misuse.
        //
        // **Each axis is read exactly once, and the reads precede the writes.**
        // The cache removes the allocation and nothing else: reading `home`
        // twice, or writing `anchor.x = home.x` and then `anchor.y = home.y`,
        // would still be two reads of a live accessor — the second separated
        // from the first by a field write. The destructuring below is the copy
        // this seam already owed.
        const { x } = home;
        const { y } = home;

        anchor.x = x;
        anchor.y = y;

        return anchor;
      }

      // The grab position, which is the origin rect itself — the answer for a
      // rejected or canceled drop with no `home` configured, and for one whose
      // controller closed before the resolver could be called.
      anchor.x = origin.left;
      anchor.y = origin.top;

      return anchor;
    },

    /**
     * **It publishes `current.domain` and nothing else.** The arms are the
     * consumer's to discriminate; with one `onEnd` there is no routing
     * predicate to get wrong.
     *
     * `null` means one thing only: the operation failed **before** `onStart`
     * ran, so the consumer has no record of it beginning.
     */
    finalized(current) {
      const { domain } = current;

      if (domain) {
        slots.onEnd?.(domain);
      }
    },

    /**
     * **Forward, and nothing else.** The kernel builds the public error, picks
     * its class and owns the latch; this member is the last hop, and it is
     * {@link deliver} itself.
     *
     * It neither maps nor attaches context: the mapping is kernel-owned, so it
     * cannot mean two things in two behaviors, and a `domain: null` context is
     * strictly redundant with the terminal.
     *
     * Its one caller is the kernel's `notify`, which gates on the latch and
     * discards a throwing handler for every route it owns — including `panic`'s
     * post-closure delivery, which is exactly why neither rule can live here.
     */
    reportError: deliver,

    retire() {
      progress = MINTED;
      lift = null;
      originRect = null;
      space = null;
      view = null;

      // **Stored in installation order, walked backwards.** Each is wrapped
      // individually, so one throwing hook cannot stop a later one from
      // releasing what it holds.
      for (let i = slots.retireHooks.length - 1; i >= 0; i -= 1) {
        unwind(slots.retireHooks[i]!);
      }
    },
  };
}
