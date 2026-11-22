import type { Family, FamilyAccessor } from './family.ts';
import {
  createConsumer,
  dispose,
  endBatch,
  startBatch,
  update,
} from './internal/graph.ts';
import {
  clock,
  createNode,
  type Equality,
  type Input,
  type Node,
} from './internal/node.ts';

export type { Equality };

/** A node whose value can be read. */
export type Readable<T> = Readonly<{
  /** The label an inspector shows for the node. */
  name: string | undefined;
  /** Reads the current value. It subscribes to nothing, also inside a run. */
  get(): T;
}>;

/** A node whose value is set by its owner. */
export type Signal<T> = Readable<T> &
  Readonly<{
    /**
     * Replaces the value, unless the node's equality function says that the
     * new value equals the current one. Outside a batch, the effects that the
     * write reaches run before `set` returns.
     */
    set(value: T): void;
  }>;

/** A declared input of a computed or effect. */
export type Source = Readable<unknown> | Family<unknown>;

/** A node whose value is a function of its declared inputs. */
export type Computed<T> = Readable<T> &
  Readonly<{
    /** The declared inputs, in the order of the callback's parameters. */
    sources: readonly Source[];
  }>;

/** Reads its input's value and, during its consumer's run, marks the edge as read. */
export type Accessor<T> = () => T;

/** The value type of a node. */
export type ValueOf<N> = N extends { get(): infer T } ? T : never;

/** One accessor per declared input, in the same positions. */
export type Accessors<I extends readonly Source[]> = {
  [K in keyof I]: I[K] extends { list: { get(): ReadonlyArray<infer M> } }
    ? FamilyAccessor<ValueOf<M>>
    : Accessor<ValueOf<I[K]>>;
};

export type SignalOptions<T> = Readonly<{
  /** The label an inspector shows for the node. */
  name?: string;
  /**
   * Decides whether a new value equals the current one, in which case the
   * node's consumers aren't marked. `Object.is` by default.
   */
  equals?(previous: T, next: T): boolean;
}>;

export type ComputedOptions<T> = SignalOptions<T>;

export type EffectOptions = Readonly<{
  /** The label an inspector shows for the node. */
  name?: string;
}>;

/** What an effect's callback may return: a function that runs before the next run, and on disposal. */
export type EffectCleanup = () => void;

/** Disposes an effect: it unsubscribes, runs its cleanup and never runs again. */
export type Dispose = () => void;

function readSignal(this: Node): unknown {
  return this.value;
}

function writeSignal(this: Node, value: unknown): void {
  if (!this.equals(this.value, value)) {
    this.value = value;
    this.version += 1;
    clock.version += 1;
    this.firstSubscriber?.target.propagate!(this);
  }
}

/**
 * Creates a signal.
 *
 * @param value - The initial value.
 * @param options - The node's name and equality function.
 */
export function signal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return createNode(
    value,
    options,
    undefined,
    undefined,
    false,
    undefined,
    readSignal,
    writeSignal,
  ) as unknown as Signal<T>;
}

/**
 * Creates a computed: a lazy, cached function of its declared inputs.
 *
 * `fn` receives one accessor per input, in the same order. A run subscribes to
 * exactly the inputs it read through their accessors, so a branch that isn't
 * taken subscribes to nothing. A computed with no observer, an effect or an
 * observed computed reading it, holds no subscription and runs only when it is
 * read. A run that throws caches the error, and each read rethrows it until a
 * source changes.
 *
 * Read values through the accessors only. A `get()` inside `fn` reads the
 * current value and subscribes to nothing, so the computed doesn't run again
 * when that value changes.
 *
 * @param inputs - Every node the computed may read.
 * @param fn - Computes the value from the accessors.
 * @param options - The node's name and equality function.
 */
export function computed<const I extends readonly Source[], T>(
  inputs: I,
  fn: (...accessors: Accessors<I>) => T,
  options?: ComputedOptions<T>,
): Computed<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return createConsumer(
    inputs as unknown as readonly Input[],
    fn,
    options,
    false,
  ) as unknown as Computed<T>;
}

/**
 * Creates an effect and runs it once, before `effect` returns.
 *
 * Like a computed, a run subscribes to exactly the inputs it read through their
 * accessors. So an effect runs again only when an input its last run read
 * changes: an input it declares and never reads never triggers it. Effects run
 * after the outermost batch, or after the write outside a batch.
 *
 * @param inputs - Every node the effect may read.
 * @param fn - The effect. It may return a cleanup, which runs before the next
 *   run and on disposal.
 * @param options - The node's name.
 * @returns The disposer.
 */
export function effect<const I extends readonly Source[]>(
  inputs: I,
  // oxlint-disable-next-line typescript/no-invalid-void-type
  fn: (...accessors: Accessors<I>) => EffectCleanup | void,
  options?: EffectOptions,
): Dispose {
  const node = createConsumer(
    inputs as unknown as readonly Input[],
    fn,
    options,
    true,
  );

  startBatch();

  try {
    update(node);
  } catch (error) {
    dispose(node);
    throw error;
  } finally {
    endBatch();
  }

  return () => dispose(node);
}

/**
 * Runs `fn` and propagates its writes once, when the outermost batch ends.
 *
 * @param fn - The writes to batch.
 * @returns What `fn` returns.
 */
export function batch<T>(fn: () => T): T {
  startBatch();

  try {
    return fn();
  } finally {
    endBatch();
  }
}
