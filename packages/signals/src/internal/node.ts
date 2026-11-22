/** The node's value is current. */
export const CLEAN = 0;
/** A source of a source changed: the node's sources need checking. */
export const CHECK = 1;
/** A source changed: the node runs again on its next update. */
export const DIRTY = 2;

export type NodeState = typeof CLEAN | typeof CHECK | typeof DIRTY;

export type Equality = (previous: any, next: any) => boolean;

/**
 * One edge from a source to the node that reads it. A declared edge is created
 * once, with its consumer, and reused for every run. A family member edge is
 * created by the first run that reads the member, and is deleted by the first
 * run that doesn't.
 *
 * An edge is in up to three intrusive lists, so that a run which reads the same
 * edges as the previous run allocates nothing:
 *
 * - the consumer's read list of the current run (`nextRead`);
 * - the consumer's active list: the reads of its last completed run
 *   (`nextActive`);
 * - the source's subscriber list (`previousSubscriber`, `nextSubscriber`),
 *   only while the consumer is observed.
 */
export type Edge = {
  readonly source: Node;
  readonly target: Node;
  /** The target's run number of the last run that read this edge. */
  lastRead: number;
  /** The source's version that the target's last run read. */
  seenVersion: number;
  nextRead: Edge | null;
  nextActive: Edge | null;
  subscribed: boolean;
  previousSubscriber: Edge | null;
  nextSubscriber: Edge | null;
  /** The family member map that owns this edge, for a member edge. */
  family: Map<Node, Edge> | undefined;
};

/**
 * A declared input that supplies its own accessor: the family of
 * `family.ts`. The core only asks it for the accessor.
 */
export type AccessorFactory = Readonly<{
  name: string | undefined;
  /** The node whose value is the list of members. */
  list: Node;
  bind(edge: Edge): unknown;
}>;

export type Input = Node | AccessorFactory;

/**
 * The one shape of signals, computeds and effects, so that the hot paths see
 * one hidden class. A field that a kind doesn't use stays at its initial value.
 */
export type Node = {
  /** The value; an effect keeps its cleanup here. */
  value: unknown;
  /** Advances each time `value` changes. `0` until a computed first runs. */
  version: number;
  /** The computed's last run threw, and `value` holds what it threw. */
  threw: boolean;
  state: NodeState;
  readonly equals: Equality;
  readonly name: string | undefined;
  /** The declared inputs, in the callback's parameter order. */
  readonly sources: readonly Input[];
  /** The callback of a computed or effect; `undefined` for a signal and for a disposed effect. */
  fn: ((...accessors: any[]) => unknown) | undefined;
  accessors: unknown[] | undefined;
  readonly effect: boolean;
  /** Counts runs, so that `Edge.lastRead` needs no clearing. */
  runNumber: number;
  running: boolean;
  /** The global write count at the last check of an unobserved computed. */
  checkedVersion: number;
  readHead: Edge | null;
  readTail: Edge | null;
  activeHead: Edge | null;
  firstSubscriber: Edge | null;
  lastSubscriber: Edge | null;
  nextQueued: Node | null;
  /**
   * The propagation of a computed or effect. A signal's `set` calls it on its
   * first subscriber, so that a composition with signals only carries no
   * scheduler: only a consumer can subscribe, and the consumer brings it.
   */
  readonly propagate: ((source: Node) => void) | undefined;
  readonly get: (() => unknown) | undefined;
  readonly set: ((value: unknown) => void) | undefined;
};

export type NodeOptions = Readonly<{
  /** The label an inspector shows for the node. */
  name?: string;
  /** Decides whether a new value replaces the current one. `Object.is` by default. */
  equals?: Equality;
}>;

/** Counts writes to signals, so that an unobserved computed can tell whether anything changed since it was last checked. */
export const clock: { version: number } = { version: 0 };

const NO_SOURCES: readonly Input[] = [];

export function createNode(
  value: unknown,
  options: NodeOptions | undefined,
  sources: readonly Input[] = NO_SOURCES,
  fn?: (...accessors: any[]) => unknown,
  effect = false,
  propagate?: (source: Node) => void,
  get?: () => unknown,
  set?: (value: unknown) => void,
): Node {
  return {
    value,
    version: 0,
    threw: false,
    state: fn ? DIRTY : CLEAN,
    equals: options?.equals ?? Object.is,
    name: options?.name,
    sources,
    fn,
    accessors: undefined,
    effect,
    runNumber: 0,
    running: false,
    checkedVersion: -1,
    readHead: null,
    readTail: null,
    activeHead: null,
    firstSubscriber: null,
    lastSubscriber: null,
    nextQueued: null,
    propagate,
    get,
    set,
  };
}

export function createEdge(source: Node, target: Node): Edge {
  return {
    source,
    target,
    lastRead: 0,
    seenVersion: 0,
    nextRead: null,
    nextActive: null,
    subscribed: false,
    previousSubscriber: null,
    nextSubscriber: null,
    family: undefined,
  };
}
