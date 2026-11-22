import {
  CHECK,
  CLEAN,
  clock,
  createEdge,
  createNode,
  DIRTY,
  type Edge,
  type Input,
  type Node,
  type NodeOptions,
} from './node.ts';

let batchDepth = 0;
let queueHead: Node | null = null;
let queueTail: Node | null = null;

export function startBatch(): void {
  batchDepth += 1;
}

export function endBatch(): void {
  batchDepth -= 1;

  if (batchDepth === 0) {
    flush();
  }
}

/**
 * Runs the queued effects in the order they were marked. An effect that throws
 * doesn't stop the others: the first error is rethrown after the queue is
 * empty. Writes from an effect queue more effects, which run in the same flush.
 */
function flush(): void {
  if (queueHead === null) {
    return;
  }

  batchDepth += 1;
  let failed = false;
  let error: unknown;

  while (queueHead !== null) {
    const node: Node = queueHead;
    queueHead = node.nextQueued;
    node.nextQueued = null;

    if (queueHead === null) {
      queueTail = null;
    }

    if (node.fn) {
      try {
        update(node);
      } catch (thrown) {
        if (!failed) {
          failed = true;
          error = thrown;
        }
      }
    }
  }

  batchDepth -= 1;

  if (failed) {
    throw error;
  }
}

function mark(node: Node, state: typeof CHECK | typeof DIRTY): void {
  const previous = node.state;

  if (previous < state) {
    node.state = state;

    // A node that was already marked has marked its own consumers.
    if (previous === CLEAN) {
      if (node.effect) {
        if (queueTail === null) {
          queueHead = node;
        } else {
          queueTail.nextQueued = node;
        }

        queueTail = node;
      } else {
        for (
          let edge = node.firstSubscriber;
          edge !== null;
          edge = edge.nextSubscriber
        ) {
          mark(edge.target, CHECK);
        }
      }
    }
  }
}

/** Marks the subscribers of a signal that changed, and flushes outside a batch. */
export function propagate(source: Node): void {
  for (
    let edge = source.firstSubscriber;
    edge !== null;
    edge = edge.nextSubscriber
  ) {
    mark(edge.target, DIRTY);
  }

  if (batchDepth === 0) {
    flush();
  }
}

/**
 * Brings a computed or effect up to date.
 *
 * An observed node receives marks, so a clean one is current. An unobserved
 * computed receives none, so it checks its sources whenever any signal was
 * written since its last check. A check reads the active edges in the order the
 * last run read them, and stops at the first changed source, so that a branch
 * condition is checked before the computeds behind the branch.
 */
export function update(node: Node): void {
  if (node.firstSubscriber === null && !node.effect) {
    if (node.state === CLEAN && node.checkedVersion === clock.version) {
      return;
    }

    node.checkedVersion = clock.version;

    if (node.state === CLEAN) {
      node.state = CHECK;
    }
  } else if (node.state === CLEAN) {
    return;
  }

  if (node.state === CHECK) {
    node.state = CLEAN;

    for (let edge = node.activeHead; edge !== null; edge = edge.nextActive) {
      const { source } = edge;

      if (source.fn) {
        update(source);
      }

      if (edge.seenVersion !== source.version) {
        node.state = DIRTY;
        break;
      }
    }
  }

  if (node.state === DIRTY) {
    // Clean before the run, so that a write during the run marks it again.
    node.state = CLEAN;

    if (node.effect) {
      runCleanup(node);
      node.value = run(node);
    } else {
      let value: unknown;
      let threw = false;

      try {
        value = run(node);
      } catch (error) {
        value = error;
        threw = true;
      }

      if (
        threw ||
        node.threw ||
        node.version === 0 ||
        !node.equals(node.value, value)
      ) {
        node.value = value;
        node.threw = threw;
        node.version += 1;
      }
    }
  }
}

function run(node: Node): unknown {
  node.runNumber += 1;
  node.running = true;
  node.readHead = null;
  node.readTail = null;

  try {
    return node.fn!.apply(undefined, node.accessors!);
  } finally {
    node.running = false;
    reconcile(node);
  }
}

/**
 * Makes the run's reads the node's active edges: an edge the run didn't read
 * leaves its source's subscribers, and an edge it read joins them while the
 * node is observed. Both walks follow the intrusive lists, so their cost is the
 * number of edges read by this run and the previous one, not the declaration's
 * length.
 */
function reconcile(node: Node): void {
  const observed =
    node.fn !== undefined && (node.effect || node.firstSubscriber !== null);

  for (let edge = node.activeHead; edge !== null; edge = edge.nextActive) {
    if (edge.lastRead !== node.runNumber) {
      if (edge.subscribed) {
        unsubscribe(edge);
      }

      edge.family?.delete(edge.source);
    }
  }

  for (let edge = node.readHead; edge !== null; edge = edge.nextRead) {
    edge.nextActive = edge.nextRead;

    if (observed && !edge.subscribed) {
      subscribe(edge);
    }
  }

  node.activeHead = node.readHead;
}

function subscribe(edge: Edge): void {
  const { source } = edge;

  // A computed that gains its first subscriber stops checking on read and
  // receives marks instead, so it has to be current and subscribed to its own
  // sources before it does.
  if (source.fn && source.firstSubscriber === null) {
    update(source);

    for (let own = source.activeHead; own !== null; own = own.nextActive) {
      if (!own.subscribed) {
        subscribe(own);
      }
    }
  }

  edge.subscribed = true;
  edge.previousSubscriber = source.lastSubscriber;

  if (source.lastSubscriber === null) {
    source.firstSubscriber = edge;
  } else {
    source.lastSubscriber.nextSubscriber = edge;
  }

  source.lastSubscriber = edge;
}

function unsubscribe(edge: Edge): void {
  const { source, previousSubscriber, nextSubscriber } = edge;
  edge.subscribed = false;
  edge.previousSubscriber = null;
  edge.nextSubscriber = null;

  if (previousSubscriber === null) {
    source.firstSubscriber = nextSubscriber;
  } else {
    previousSubscriber.nextSubscriber = nextSubscriber;
  }

  if (nextSubscriber === null) {
    source.lastSubscriber = previousSubscriber;
  } else {
    nextSubscriber.previousSubscriber = previousSubscriber;
  }

  // A computed that loses its last subscriber holds no subscription, so that
  // nothing keeps it reachable from its sources. It checks its sources on its
  // next read instead.
  if (source.fn && source.firstSubscriber === null) {
    source.checkedVersion = -1;

    for (let own = source.activeHead; own !== null; own = own.nextActive) {
      if (own.subscribed) {
        unsubscribe(own);
      }
    }
  }
}

/**
 * Reads an edge's source for its target. During the target's run the read
 * marks the edge for the run; outside it, as from a timer or after an `await`,
 * it reads the current value and marks nothing.
 */
export function read(edge: Edge): unknown {
  const { source, target } = edge;
  const tracked = target.running;

  if (tracked && edge.lastRead !== target.runNumber) {
    edge.lastRead = target.runNumber;
    edge.nextRead = null;

    if (target.readTail === null) {
      target.readHead = edge;
    } else {
      target.readTail.nextRead = edge;
    }

    target.readTail = edge;
  }

  if (source.fn) {
    update(source);
  }

  if (tracked) {
    edge.seenVersion = source.version;
  }

  if (source.threw) {
    throw source.value;
  }

  return source.value;
}

function readComputed(this: Node): unknown {
  update(this);

  if (this.threw) {
    throw this.value;
  }

  return this.value;
}

/**
 * Creates a computed or effect with one edge and one accessor per declared
 * input, created once and reused by every run.
 */
export function createConsumer(
  inputs: readonly Input[],
  fn: (...accessors: any[]) => unknown,
  options: NodeOptions | undefined,
  effect: boolean,
): Node {
  const node = createNode(
    undefined,
    options,
    inputs,
    fn,
    effect,
    propagate,
    effect ? undefined : readComputed,
  );

  node.accessors = inputs.map((input) => {
    if ('bind' in input) {
      return input.bind(createEdge(input.list, node));
    }

    const edge = createEdge(input, node);
    return () => read(edge);
  });

  return node;
}

export function dispose(node: Node): void {
  node.fn = undefined;

  for (let edge = node.activeHead; edge !== null; edge = edge.nextActive) {
    if (edge.subscribed) {
      unsubscribe(edge);
    }
  }

  node.activeHead = null;
  runCleanup(node);
}

/** Runs the cleanup that an effect's last run returned, if any. */
function runCleanup(node: Node): void {
  // An effect's `value` is what its callback returned: a cleanup or nothing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const cleanup = node.value as (() => void) | undefined;
  node.value = undefined;
  cleanup?.();
}
