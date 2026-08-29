/**
 * **Probe 13a — discrete (keyboard) input against the frozen SPI.**
 *
 * Write-up: `.plan/probes/13a-discrete-input.md`.
 *
 * ## What this file is
 *
 * A typed probe, in the sense contract 00 requires: the negative claims are
 * `@ts-expect-error` assertions, and `tsc` errors on an *unused*
 * `@ts-expect-error`, so a green `npx just typecheck` is the statement that each
 * one still fails to compile. It imports the **real** frozen SPI from
 * `../../src/kernel/spec.ts` rather than restating it, so it cannot drift.
 *
 * ## What it is not
 *
 * It is not an implementation and contains no runtime path — every value is
 * `declare`d. Typecheck cannot catch a lifecycle error (00), so the claims below
 * are split explicitly:
 *
 * - **N-*** — proved by compilation. These are the expressibility failures.
 * - **R-*** — runtime facts about the kernel executor, each citing the line that
 *   establishes it. Typecheck says nothing about these; they are read from
 *   `src/kernel/kernel.ts` and stated so the case is complete.
 * - **P-*** — proved by compilation, and *positive*: what the frozen SPI already
 *   expresses. The second list is as valuable as the first (plan.md, phase 13).
 *
 * ## The case in one sentence
 *
 * A keyboard command is a **complete one-slot operation with no pointer**, whose
 * feasibility must be answered *synchronously inside the native listener* so
 * that `preventDefault()` is called only when the command is possible — and the
 * frozen SPI has no seam that can be reached from a non-pointer event, and no
 * behavior entry that returns a decision to its caller.
 */
import type { Draft, FramePartOf } from '../../src/kernel/frames.ts';
import type {
  ActionTransition,
  BehaviorSpec,
  KernelHost,
} from '../../src/kernel/spec.ts';

/* ------------------------------------------------------- the reference rule */

/**
 * The shipped rule, `packages/drag/src/sortable/keyboard.ts`, reduced to its
 * type. It is pure, DOM-free, and produces the same shape the pointer path
 * feeds to the proposal builder — deliberately, so request semantics cannot
 * diverge between input modes.
 */
export const DIRECTION_UP = 0;
export const DIRECTION_DOWN = 1;
export type CommandDirection = typeof DIRECTION_UP | typeof DIRECTION_DOWN;

export type Insertion = Readonly<{
  version: number;
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

export type Snapshot = Readonly<{
  items: readonly HTMLElement[];
  version: number;
}>;

/** `null` means *inert*: the item is missing, or already at that edge. */
declare function commandInsertion(
  snapshot: Snapshot,
  item: HTMLElement,
  direction: CommandDirection,
): Insertion | null;

/** A behavior frame part, shaped like the sortable's relevant slice. */
type CommandPart = {
  item: HTMLElement | null;
  snapshot: Snapshot | null;
  insertion: Insertion | null;
};

declare const host: KernelHost;
declare const snapshot: Snapshot;
declare const item: HTMLElement;
declare const keyEvent: KeyboardEvent;

/* ------------------------------------ P — what the frozen SPI already covers */

/**
 * **P-1. The rule itself is portable unchanged.** It needs no kernel affordance
 * at all: it is a pure function of a snapshot, an item and a direction. Nothing
 * in this probe argues otherwise, and Phase 16 should port it as-is.
 */
export const p1: Insertion | null = commandInsertion(
  snapshot,
  item,
  DIRECTION_UP,
);

/**
 * **P-2. A frame part can hold a command's whole state.** No widening is needed
 * to carry the destination gap from admission to release: it is the same
 * `insertion` field the pointer path already commits.
 */
export const p2: FramePartOf<CommandPart> = {
  item: null,
  snapshot: null,
  insertion: null,
};

/**
 * **P-3. Everything downstream of an existing operation is reachable.** Once an
 * operation exists, a command needs no seam the pointer path does not already
 * use: `release.prepare` stages the `ResolutionCommand`, `settlement` classifies
 * the five cases, `anchorTarget` produces the landing point. The gap is entirely
 * on the *ingress and admission* side, which is a narrower claim than "keyboard
 * does not fit" and is what keeps the Phase 14 revision small.
 */
export type CommandRelease = BehaviorSpec<CommandPart>['release'];

/* ---------------------------------- N — the claims that must NOT be provable */

/**
 * **N-1. `admit` is closed to non-pointer events.** The frozen signature is
 * `admit(event: PointerEvent, draft)`. Method-position parameters are bivariant
 * in TypeScript, so this is not a pedantic variance failure: it errors because
 * `KeyboardEvent` and `PointerEvent` are assignable in *neither* direction.
 *
 * There is no second admission member on `BehaviorSpec` to reach instead.
 */
declare const commandAdmit: (
  event: KeyboardEvent,
  draft: Draft<CommandPart>,
) => HTMLElement | null;

// @ts-expect-error — `admit` accepts `PointerEvent`, and nothing else.
export const n1: BehaviorSpec<CommandPart>['admit'] = commandAdmit;

/**
 * **N-2. The host owns no ingress the behavior can extend.** `KernelHost` has
 * six members — `realm`, `root`, `dispatch`, `fail`, `cancel`, `destroy` — and
 * none of them registers a listener or hands the behavior an event the kernel
 * did not already classify. A behavior that wants `keydown` has to reach past
 * the SPI to `host.root` and attach its own, which puts the listener's lifetime
 * outside the kernel's ingress abort and outside I-6's terminal barrier.
 */
// @ts-expect-error — no ingress member exists on the frozen host.
export const n2: unknown = host.addIngress;

/**
 * **N-3. `dispatch` cannot answer its caller.** It returns `void`. The listener
 * that would call `preventDefault()` therefore cannot learn whether the command
 * was feasible, because feasibility is decided in `prepare`, which runs when the
 * queue drains — after the listener has returned.
 *
 * This is the load-bearing failure. Everything else here has a workaround that
 * is merely ugly; this one has none, because the information flows the wrong
 * way through the only behavior-initiated entry point in the SPI.
 */
// @ts-expect-error — `dispatch` returns void; there is no decision to read.
export const n3: boolean = host.dispatch(0, keyEvent);

/**
 * **N-4. An action's decision is structurally reachable and directionally
 * useless.** This one is stated as a *positive* compile, because that is what
 * makes N-3 sharp rather than a variance quibble.
 *
 * A decision-shaped action transition compiles against the frozen type: `{}`
 * accepts `{ consumed: boolean }`, and `prepare` may decline by returning
 * `null`. So the SPI has no trouble *representing* a feasibility answer. What it
 * has no route for is **delivering** one: the staged value flows kernel →
 * `effect` only, and `effect` runs on the drain. There is no member on
 * `ActionTransition` whose result reaches the code that called `dispatch`.
 *
 * The failure is therefore not "an action cannot decide". It is that every
 * behavior-initiated entry in the SPI is *fire-and-forget by construction*, and
 * `preventDefault()` needs a return value inside the listener.
 */
export const n4: ActionTransition<CommandPart> = {
  prepare(_tag, _argument, _draft): { consumed: boolean } | null {
    return { consumed: true };
  },
  effect(): void {},
};

/**
 * **N-5. There is no way to mint an operation without a press.** The kernel's
 * activation capability, `ActivationScope`, is *granted*, never requested: it
 * carries the lift session and the grab rect the kernel acquired for itself
 * during `pointerdown`. `BehaviorSpec` has no member that asks for one, and
 * `KernelHost` has no `activate`.
 */
// @ts-expect-error — the behavior cannot start an operation.
export const n5: unknown = host.activate;

/* ------------------------------------------- R — runtime facts, not typed -- */

/**
 * **R-1. The kernel registers exactly one ingress listener, and it is
 * `pointerdown` on `root`** — `src/kernel/kernel.ts:1970`, inside `arm()`. The
 * per-operation `keydown` listener (`src/kernel/pointer.ts:48`) exists only
 * while an operation is live and calls exactly one thing, `onEscape` → a
 * cancellation the kernel marks `CANCEL_ABORTED`. Neither is extensible from a
 * behavior.
 *
 * **R-2. `admit` is called from one place**, `admitPress`
 * (`src/kernel/kernel.ts:647`), which is reached only from `onPointerDown`. Even
 * if N-1 were relaxed, the kernel would never call it for a key.
 *
 * **R-3. `PENDING → ACTIVE` is a pointer-distance test.** `kernel.ts:1543-1547`
 * reads `spec.config.threshold` and compares squared travel from the grab
 * point. A command has no travel, so a keyboard operation admitted as a press
 * would sit in `PENDING` forever. This is why a command is not "a press without
 * moves": it must skip `PENDING` entirely.
 *
 * **R-4. The kernel frame slice has no room for a pointerless operation.**
 * `pointerId` is a `number` with `-1` as the idle sentinel
 * (`src/kernel/frames.ts:52`), and `onPointer` gates every sample on
 * `event.pointerId !== current.pointerId` (`kernel.ts:616`). A command needs an
 * operation whose identity is not a pointer identity.
 *
 * Together R-1…R-4 are why the pressure point recorded at
 * 02 §`ActionTransition`, which named keyboard sorting as the case expected to
 * revise the kernel contract rather than to be worked around, was right.
 */

/* ------------------------------ the smallest vocabulary that expresses it -- */

/**
 * **Candidate, not a decision.** Phase 14 owns the revision; this exists so the
 * case is stated with a shape that demonstrably compiles, rather than with a
 * paragraph. 02 already names the alternative under consideration — "a small
 * typed lifecycle-intent vocabulary" — and this is the smallest version of it
 * that covers N-1…N-5.
 *
 * Three properties it deliberately keeps:
 *
 * 1. **The kernel still owns ingress.** The behavior declares *which* event
 *    types it wants bound to the root; it never registers a listener, so the
 *    lifetime stays inside the kernel's ingress abort and I-6's terminal
 *    barrier is untouched.
 * 2. **The behavior still never drives a transition.** `decide` returns a
 *    *value*; the kernel does the minting, the lift, the phase commits and the
 *    envelope, exactly as it does for a press. H-3 is preserved.
 * 3. **The decision is synchronous and reaches the producer**, which is the
 *    whole point: it is what lets the kernel call `preventDefault()` for a
 *    feasible command and leave the key alone for an inert one.
 */

/** What the kernel does with the event, decided inside the native listener. */
export const INTENT_DECLINED = 0;
/** Consume the event and run one complete operation, with `prepared` staged. */
export const INTENT_OPERATION = 1;

export type IntentDecision<Prepared extends {}> =
  | Readonly<{ type: typeof INTENT_DECLINED }>
  | Readonly<{
      type: typeof INTENT_OPERATION;
      /** The element to lift, as `admit` returns. */
      visual: HTMLElement;
      /**
       * Staged by the same rules as any `prepare`: acquisitions travel out
       * through this value, and the kernel hands it to `release.prepare`
       * without inspecting it.
       */
      prepared: Prepared;
    }>;

export type IntentTransition<
  Part extends object,
  Prepared extends {},
> = Readonly<{
  /** The event types the kernel binds on `root` for the controller's life. */
  types: readonly string[];
  /**
   * Runs synchronously inside the native listener, with the draft open, after
   * the kernel's own idle/closed guards — the same position `admit` occupies,
   * and the only position from which `preventDefault()` is meaningful.
   */
  decide(event: Event, draft: Draft<Part>): IntentDecision<Prepared>;
}>;

/** A command's staged plan: the destination gap, resolved before the commit. */
type CommandIntent = Readonly<{ insertion: Insertion }>;

declare function directionOf(event: KeyboardEvent): CommandDirection | null;
declare function resolveCommandItem(
  event: Event,
  snapshot: Snapshot,
): HTMLElement | null;

/**
 * The keyboard behavior, written against the candidate. It compiles, it is
 * synchronous, and the feasibility decision — `commandInsertion(...) === null`
 * means *inert* — is made in the one place where declining still leaves the key
 * to the browser.
 */
export const commandIntent: IntentTransition<CommandPart, CommandIntent> = {
  types: ['keydown'],

  decide(event, draft) {
    const direction = directionOf(event as KeyboardEvent);

    if (direction === null || draft.snapshot === null) {
      return { type: INTENT_DECLINED };
    }

    const target = resolveCommandItem(event, draft.snapshot);

    if (target === null) {
      return { type: INTENT_DECLINED };
    }

    const insertion = commandInsertion(draft.snapshot, target, direction);

    // The edge case, and the reason the decision has to be synchronous: an
    // item already at the edge yields `null`, and the arrow key must keep its
    // native meaning.
    if (insertion === null) {
      return { type: INTENT_DECLINED };
    }

    return {
      type: INTENT_OPERATION,
      visual: target,
      prepared: { insertion },
    };
  },
};

/**
 * The kernel side, sketched to the same standard: a driver signature that
 * type-checks against the decision. **Inert on purpose** — it stages nothing and
 * runs nothing, because 00's warning applies with full force here. Whether the
 * operation commits `ACTIVATING → ACTIVE → RELEASING` in one synchronous
 * envelope, or introduces a ninth phase for a pointerless operation, is exactly
 * what Phase 14 has to decide, and this file must not appear to have decided it.
 */
export declare function driveIntent<Part extends object, Prepared extends {}>(
  transition: IntentTransition<Part, Prepared>,
  event: Event,
  draft: Draft<Part>,
): boolean;
