import type { Space } from '@ydinjs/box-quad';
import type { Outcome } from './outcome.ts';

/**
 * Cleanup for an operation. It receives the outcome, or `null` on destruction,
 * where neither `settle` nor `end` runs. A disposer added after release runs at
 * once.
 */
export type DragDisposer = (outcome: Outcome | null) => void;

/**
 * One operation, as a behavior sees it. The coordinates change between hooks, so
 * read them when needed.
 */
export type Drag<State = undefined> = Readonly<{
  item: HTMLElement;
  /** The behavior's own value from admission. */
  state: State;
  /** `-1` for an operation `command` admitted, which has no pointer. */
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  /** Aborts when the operation releases its presentation. */
  signal: AbortSignal;
  use(dispose: DragDisposer): void;
  /**
   * Runs `step` in a pass: at once when no pass is running, otherwise between
   * steps, in request order. The same function requested again before it runs
   * runs once. The step receives this `Drag` from the end of activation until the
   * drop or the decision, and `null` otherwise.
   *
   * Acts only while this operation is the controller's current one, so a
   * retained `Drag` never reaches a later operation. Afterwards it does nothing:
   * cleanup after an operation belongs in `use`.
   *
   * Code outside a hook, such as a consumer's method or a frame callback, must
   * write behavior state through this. Foreign code can run during any DOM write
   * the kernel makes, and a direct write would change the running step.
   */
  requestStep(step: (drag: Drag<State> | null) => void): void;
  /** Acts only while this operation is current and undecided. */
  requestCancel(reason?: unknown): void;
}>;

/** The members of `Drag` whose types name `Drag` itself. */
type SelfNamingMembers = 'requestStep';

/** `Drag` for a behavior composed with `lift`. */
export type LiftedDrag<State = undefined> = Omit<
  Drag<State>,
  SelfNamingMembers
> &
  Readonly<{
    /** See `Drag.requestStep`. */
    requestStep(step: (drag: LiftedDrag<State> | null) => void): void;
    visual: HTMLElement;
    box: HTMLElement;
    /** The visual's rect at the grab. */
    rect: DOMRectReadOnly;
    boxWidth: number;
    boxHeight: number;
    /** What the visual inherits. Pass it to `localDelta` from `@ydinjs/box-quad`. */
    visualSpace: Space;
    /** What the item inherits. */
    itemSpace: Space;
    /** The viewport delta last translated to. */
    translatedX: number;
    translatedY: number;
    /** Moves the lifted visual to a viewport delta from the grab. */
    translate(x: number, y: number): void;
  }>;

/** Runs one disposer. Whatever it throws, the caller's walk continues. */
export function runDragDisposer(
  dispose: DragDisposer,
  outcome: Outcome | null,
  raise: (error: unknown) => void,
): void {
  try {
    dispose(outcome);
  } catch (error) {
    raise(error);
  }
}
