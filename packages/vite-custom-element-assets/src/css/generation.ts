import { fileURLToPath } from 'node:url';
import { MessageChannel, Worker, type MessagePort } from 'node:worker_threads';

type Pending = {
  readonly path: string;
  /**
   * Generations destroyed under this request. An invalidation reaching a
   * request attached to nothing counts nothing, so the unit is a logical
   * supersession rather than a watcher event: one multi-file write is one.
   */
  supersessions: number;
  /**
   * When the first supersession happened. The clock never resets, so only a
   * request that never completes accumulates time.
   */
  supersededAt: number;
  resolve(result: EvaluationResult): void;
  reject(error: Error): void;
};

type Response = Readonly<{
  id: number;
  code?: string;
  message?: string;
  stack?: string;
}>;

type Generation = {
  readonly worker: Worker;
  readonly monitor: MessagePort;
  readonly deps: Set<string>;
  readonly pending: Map<number, Pending>;
  /**
   * Issued request ids. Generation-scoped, because a response is only ever
   * matched against the pending map of the generation that issued it.
   */
  requests: number;
};

export type EvaluationResult = Readonly<{
  code: string;
  /**
   * Every file resolved so far by the generation that produced this code. A
   * superseded request resolves against its successor, so this is the set the
   * accepted answer was evaluated under and never the one the request started
   * in.
   */
  deps: ReadonlySet<string>;
}>;

/**
 * The built `css/` directory, anchored on the package's own manifest rather
 * than on `import.meta.url`: this module is bundled into whichever chunk its
 * importers share, so its own location is not a fact about where the worker
 * and its preloads sit.
 */
const assets = new URL(
  'css/',
  import.meta.resolve('@ydinjs/vite-custom-element-assets/package.json'),
);

/**
 * Every generation the module has created and not yet disposed, in exactly one
 * of two live states: **accepting** — `current`, the one new requests are
 * issued to — and **draining**, which takes no new requests and whose snapshot
 * is still valid, so the requests left on it may settle and publish. An entry's
 * own evaluation failure produces the second: Node poisons that module's
 * registry entry permanently, which is a fact about the isolate and not about
 * the files.
 *
 * **Everything whose subject is _the world changed_ or _the process is going
 * away_ ranges over this set and never over `current` alone.** A generation
 * reachable only through the slot is invisible to invalidation the moment a
 * throw demotes it, and its siblings then publish an answer evaluated across a
 * change the module was told about.
 *
 * One set per process, shared by every plugin instance that wants one. Sharing
 * is sound because evaluation depends only on file contents: the consumer's
 * options reach `compileCSS`, which is downstream of this.
 */
const generations = new Set<Generation>();

let current: Generation | undefined;
let consumers = 0;

/**
 * Requests waiting for a successor. A request parks when an invalidation
 * detaches it and when it arrives while the coalescing window is open; one rule
 * and no bypass, because a request allowed to create a generation mid-storm
 * defeats the coalescing and is in any case evaluating against files that are
 * still moving.
 */
const parked = new Set<Pending>();

let coalescing: NodeJS.Timeout | undefined;

/**
 * Quiet time the tracked set must show before a successor is created. A
 * performance parameter and not a correctness one: at zero the design is still
 * correct and merely wasteful, and a larger value merely adds latency. Fifty
 * milliseconds is under four per cent of one 1.2–2.7 s generation, and long
 * enough for one process's multi-file write to arrive as a single wave.
 */
const COALESCING_WINDOW = 50;

/**
 * Supersessions a request must have taken before the budget can abandon it.
 * A floor rather than a cap: a single supersession is always survivable, and a
 * long evaluation followed by one late save is never abandoned on the clock
 * alone.
 */
const SUPERSESSION_FLOOR = 2;

/**
 * How long continuous invalidation may keep one request from completing. The
 * budget must exceed the span over which any terminating rebuild writes tracked
 * files: three times the worst measured generation and an order of magnitude
 * beyond the largest tracked burst, and still short enough that a runaway
 * writer surfaces inside one developer's attention span.
 *
 * **A threshold on patience, not on correctness.** At any value no output is
 * torn, none is stale and none from an abandoned generation is published; the
 * value decides only when the module stops waiting.
 */
const STABILITY_BUDGET = 10_000;

/**
 * Releases the handles. The parent-side `MessagePort` with a live `message`
 * listener is what keeps the event loop alive — `worker.unref()` alone looks
 * correct and is not — and `terminate()` detaches it, so closing the port first
 * only makes the ownership explicit.
 */
function dispose(generation: Generation): void {
  generations.delete(generation);

  if (current === generation) {
    current = undefined;
  }

  generation.monitor.close();
  void generation.worker.terminate();
}

/**
 * Empties a generation's attachment and disposes it, returning the requests
 * that were on it.
 *
 * **Detachment precedes termination**, which is what makes a dying worker's
 * answer unpublishable: its reply arrives to an attachment that no longer holds
 * the id, and only an attached request can be resolved.
 */
function detach(generation: Generation): Pending[] {
  const requests = [...generation.pending.values()];

  generation.pending.clear();
  dispose(generation);

  return requests;
}

function settle(generation: Generation, id: number, apply: () => void): void {
  generation.pending.delete(id);
  apply();

  if (current !== generation && generation.pending.size === 0) {
    dispose(generation);
  }
}

function fail(generation: Generation, error: Error): void {
  for (const request of detach(generation)) {
    request.reject(error);
  }
}

function create(): Generation {
  const { port1, port2 } = new MessageChannel();
  const deps = new Set<string>();
  const pending = new Map<number, Pending>();
  const worker = new Worker(new URL('css-worker.js', assets), {
    execArgv: [
      '--import',
      fileURLToPath(new URL('deps-tracker.js', assets)),
      '--import',
      fileURLToPath(new URL('styles-import.js', assets)),
    ],
    workerData: { monitorPort: port2 },
    transferList: [port2],
  });
  const generation: Generation = {
    worker,
    monitor: port1,
    deps,
    pending,
    requests: 0,
  };

  port1.on('message', (path: string) => {
    deps.add(path);
  });

  worker.on('message', (response: Response) => {
    const request = pending.get(response.id);

    if (!request) {
      return;
    }

    if (response.message == null) {
      settle(generation, response.id, () => {
        request.resolve({ code: response.code ?? '', deps });
      });

      return;
    }

    // Node caches a module's evaluation failure permanently in the isolate that
    // produced it, so the corrected file would keep throwing the original error
    // until the process restarted. The generation stops accepting and goes on
    // draining: only the module that threw is poisoned, so the requests already
    // in flight finish on a snapshot that is still valid.
    if (current === generation) {
      current = undefined;
    }

    settle(generation, response.id, () => {
      // Rebuilt rather than re-wrapped, so the entry's own error reaches the
      // dev-server overlay with its own stack instead of one pointing here.
      const error = new Error(response.message);

      if (response.stack != null) {
        error.stack = response.stack;
      }

      request.reject(error);
    });
  });

  worker.on('error', (error: Error) => {
    fail(generation, error);
  });

  worker.on('exit', (code: number) => {
    if (code !== 0) {
      fail(generation, new Error(`CSS evaluation worker exited with ${code}`));
    }
  });

  generations.add(generation);

  return generation;
}

/** Attaches a request to the accepting generation, creating one if there is none. */
function attach(request: Pending): void {
  const generation = (current ??= create());
  const id = (generation.requests += 1);

  generation.pending.set(id, request);
  generation.worker.postMessage({ id, path: request.path });
}

/**
 * Issues every parked request against the successor. Arriving here is what
 * "the tracked set went quiet" means, so the generations created are bounded by
 * the number of quiet windows rather than by the number of change events.
 */
function resume(): void {
  coalescing = undefined;

  const waiting = [...parked];

  parked.clear();

  for (const request of waiting) {
    attach(request);
  }
}

/**
 * Opens the coalescing window, or re-arms one already open.
 *
 * **Unconditional**, even with nothing parked: arming costs the next request one
 * window and removes the special case that would let a request arriving in the
 * middle of a burst create a generation. **Unref'd**, so it never keeps the
 * process alive.
 */
function arm(): void {
  clearTimeout(coalescing);
  coalescing = setTimeout(resume, COALESCING_WINDOW);
  coalescing.unref();
}

function issue(request: Pending): void {
  if (coalescing) {
    parked.add(request);

    return;
  }

  attach(request);
}

/** Registers a plugin instance as a consumer of the process's generation. */
export function acquireGeneration(): void {
  consumers += 1;
}

/**
 * Drops a consumer, terminating everything the module holds when the last one
 * leaves: every generation, whether accepting or draining, every attached and
 * parked request, and the coalescing window. Nothing here reads `current`,
 * because a release arriving while a generation drains must still reach it.
 */
export function releaseGeneration(): void {
  consumers -= 1;

  if (consumers > 0) {
    return;
  }

  clearTimeout(coalescing);
  coalescing = undefined;

  const error = new Error('CSS evaluation generation was released');
  const waiting = [...parked];

  parked.clear();

  for (const generation of [...generations]) {
    fail(generation, error);
  }

  for (const request of waiting) {
    request.reject(error);
  }
}

/**
 * Abandons every live generation so that the next one evaluates the complete
 * graph against current file contents. Invalidation is generation-scoped rather
 * than entry-scoped: inside one generation a module already loaded for an
 * earlier entry resolves none of its own imports again, so per-entry
 * attribution is incomplete by construction.
 *
 * **A discard is not a failure and rejects nothing on its own.** A change
 * landing mid-evaluation leaves the loaded modules holding pre-change content
 * and the rest post-change, so the answer in flight is torn rather than merely
 * stale and cannot be published; the requests are parked and re-issued against
 * the generation that succeeds the quiet window. Rejection stays reserved for a
 * worker error, a non-zero exit, the entry's own evaluation throw, and the
 * stability budget below.
 *
 * **It ranges over every live generation**, accepting or draining. A generation
 * whose snapshot the module has been told is void may publish nothing, however
 * it stopped accepting.
 */
export function discardGeneration(): void {
  const at = performance.now();

  for (const generation of [...generations]) {
    for (const request of detach(generation)) {
      request.supersessions += 1;

      if (request.supersessions === 1) {
        request.supersededAt = at;
      }

      parked.add(request);
    }
  }

  arm();

  // The budget is evaluated here and nowhere else: an invalidation is the only
  // moment at which it can be exceeded and the only moment at which a request's
  // fate can change, which is why the policy arms no timer of its own. Parked
  // requests are included, so a storm severe enough that no generation ever
  // exists still consults it.
  for (const request of parked) {
    const elapsed = at - request.supersededAt;

    if (
      request.supersessions >= SUPERSESSION_FLOOR &&
      elapsed >= STABILITY_BUDGET
    ) {
      parked.delete(request);
      request.reject(
        new Error(
          `CSS evaluation abandoned: superseded ${request.supersessions} times over ${(elapsed / 1000).toFixed(1)}s of continuous invalidation`,
        ),
      );
    }
  }
}

export async function evaluate(path: string): Promise<EvaluationResult> {
  return await new Promise<EvaluationResult>((resolve, reject) => {
    issue({
      path,
      supersessions: 0,
      supersededAt: 0,
      resolve,
      reject,
    });
  });
}
