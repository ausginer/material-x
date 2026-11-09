import type { Writable } from 'type-fest';
import type { CallbackList } from './callback-list.ts';
import type { Gesture } from './gesture.ts';
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
export interface Drag<Operation = unknown> {
  readonly item: HTMLElement;
  /** `-1` for an operation `command` admitted, which has no pointer. */
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly originX: number;
  readonly originY: number;
  /** Aborts when the operation releases its presentation. */
  readonly signal: AbortSignal;
  use(dispose: (this: undefined, outcome: Outcome | null) => void): void;
  /**
   * As above, with `dispose` called on `receiver`. Each call adds an entry, so
   * the same pair added twice runs twice.
   */
  use<Receiver>(
    dispose: (this: Receiver, outcome: Outcome | null) => void,
    receiver: Receiver,
  ): void;
  /**
   * Runs `step` in a pass: at once when no pass is running, otherwise between
   * steps, in request order. The same function requested again before it runs
   * runs once. The step receives the operation `activate` returned, from the end
   * of activation until the drop or the decision, and `null` otherwise. It is
   * called with no receiver.
   *
   * Acts only while this operation is the controller's current one, so a
   * retained `Drag` never reaches a later operation. Afterwards it does nothing:
   * cleanup after an operation belongs in `use`.
   *
   * Code outside a hook, such as a consumer's method or a frame callback, must
   * write operation state through this. Foreign code can run during any DOM write
   * the kernel makes, and a direct write would change the running step.
   */
  requestStep(
    step: (this: undefined, operation: Operation | null) => void,
  ): void;
  /**
   * As above, with `step` called on `receiver`. The same step requested again
   * before it runs runs once only with the same receiver, so one method requested
   * for two objects runs once for each.
   */
  requestStep<Receiver>(
    step: (this: Receiver, operation: Operation | null) => void,
    receiver: Receiver,
  ): void;
  /** Acts only while this operation is current and undecided. */
  requestCancel(reason?: unknown): void;
}

/** `Drag` as the kernel writes it. No public entry exports it. */
export type KernelDrag<Operation> = Writable<Drag<Operation>>;

/**
 * Runs one disposer added after release, on its receiver or with none. A throw
 * is reported through `raise`, called on the controller.
 */
export function runDragDisposer<Argument>(
  dispose: (this: unknown, argument: Argument) => void,
  argument: Argument,
  controller: Pick<Gesture<never, never, never>, 'raise'>,
  receiver: unknown,
): void {
  try {
    dispose.call(receiver, argument);
  } catch (error) {
    controller.raise(error);
  }
}

/**
 * Runs every disposer in `disposers`, last in first out. A throw is reported
 * through `raise`, called on the controller, and the walk continues.
 */
export function runDisposers<Argument>(
  disposers: CallbackList<Argument>,
  argument: Argument,
  controller: Pick<Gesture<never, never, never>, 'raise'>,
): void {
  while (disposers.waiting) {
    try {
      disposers.runLast(argument);
    } catch (error) {
      controller.raise(error);
    }
  }
}
