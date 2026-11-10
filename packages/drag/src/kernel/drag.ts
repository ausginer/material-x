import type { Writable } from 'type-fest';
import type { CallbackList } from './callback-list.ts';
import type { Outcome } from './outcome.ts';

export interface Fallible {
  raise(error: unknown): void;
}

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
export type Drag<Operation = unknown> = Readonly<{
  item: HTMLElement;
  /** `-1` for an operation `command` admitted, which has no pointer. */
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  /** Aborts when the operation releases its presentation. */
  signal: AbortSignal;
  /**
   * Runs `dispose` when the operation releases its presentation, last in first
   * out. It receives the outcome, or `null` when destruction released the
   * operation. Added after release, it runs at once. Called with no receiver.
   */
  use(dispose: (this: undefined, outcome: Outcome | null) => void): void;
  /**
   * As above, with `dispose` called on `receiver`. Every call is its own
   * registration, so the same disposer registered twice runs twice.
   */
  use<Receiver extends object>(
    dispose: (this: Receiver, outcome: Outcome | null) => void,
    receiver: Receiver,
  ): void;
  /**
   * Runs `step` in a pass: at once when no pass is running, otherwise between
   * steps, in request order. The same step requested again before it runs runs
   * once. The step receives the operation `activate` returned, from the end of
   * activation until the drop or the decision, and `null` otherwise. Called with
   * no receiver.
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
   * before it runs runs once only when it comes with the same receiver, so one
   * method requested for two receivers runs once for each.
   */
  requestStep<Receiver extends object>(
    step: (this: Receiver, operation: Operation | null) => void,
    receiver: Receiver,
  ): void;
  /** Acts only while this operation is current and undecided. */
  requestCancel(reason?: unknown): void;
}>;

/** `Drag` as the kernel writes it. No public entry exports it. */
export type KernelDrag<Operation> = Writable<Drag<Operation>>;

/**
 * Runs one disposer added after release, on its receiver or with none. A throw
 * is reported through `raise`, called on the controller.
 */
export function runDragDisposer<Argument>(
  dispose: (this: object | undefined, argument: Argument) => void,
  argument: Argument,
  controller: Fallible,
  receiver: object | undefined,
): void {
  try {
    dispose.call(receiver, argument);
  } catch (error) {
    controller.raise(error);
  }
}

/**
 * Runs every disposer in `disposers`, a list `CallbackList.stack()` made, so
 * last in first out. A throw is reported through `raise`, called on the
 * controller, and the walk continues.
 */
export function runDisposers<Argument>(
  disposers: CallbackList<Argument>,
  argument: Argument,
  controller: Fallible,
): void {
  while (!disposers.empty) {
    try {
      disposers.run(argument);
    } catch (error) {
      controller.raise(error);
    }
  }
}
