import { fileURLToPath } from 'node:url';
import { MessageChannel, Worker, type MessagePort } from 'node:worker_threads';

type Pending = {
  readonly path: string;
  /**
   * Generations this request has been issued to. An invalidation supersedes the
   * request instead of failing it, and writes can arrive faster than a
   * generation completes, so the re-issue is bounded rather than a livelock.
   */
  attempts: number;
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
 * One generation per process, shared by every plugin instance that wants one.
 * Sharing is sound because evaluation depends only on file contents: the
 * consumer's options reach `compileCSS`, which is downstream of this.
 */
let current: Generation | undefined;
let consumers = 0;

/**
 * Generations one request may be issued to. Two is the smallest bound that
 * survives a single supersession, which is the case an ordinary save produces;
 * beyond it the invalidation is faster than evaluation and retrying is a
 * livelock rather than a recovery.
 */
const ATTEMPTS = 2;

/**
 * Releases the handles. The parent-side `MessagePort` with a live `message`
 * listener is what keeps the event loop alive — `worker.unref()` alone looks
 * correct and is not — and `terminate()` detaches it, so closing the port first
 * only makes the ownership explicit.
 */
function dispose(generation: Generation): void {
  generation.monitor.close();
  void generation.worker.terminate();
}

function settle(generation: Generation, id: number, apply: () => void): void {
  generation.pending.delete(id);
  apply();

  if (current !== generation && generation.pending.size === 0) {
    dispose(generation);
  }
}

function fail(generation: Generation, error: Error): void {
  if (current === generation) {
    current = undefined;
  }

  for (const request of generation.pending.values()) {
    request.reject(error);
  }

  generation.pending.clear();
  dispose(generation);
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
    // until the process restarted. The generation goes with the failure; the
    // requests already in flight finish on it, because only the module that
    // threw is poisoned.
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

  return generation;
}

/**
 * Issues a request to the current generation, creating one when the last was
 * discarded. This is the only writer of `current`'s request ids, so an id is
 * unique within the generation holding it and means nothing outside it.
 */
function issue(request: Pending): void {
  const generation = (current ??= create());
  const id = (generation.requests += 1);

  request.attempts += 1;
  generation.pending.set(id, request);
  generation.worker.postMessage({ id, path: request.path });
}

/** Registers a plugin instance as a consumer of the process's generation. */
export function acquireGeneration(): void {
  consumers += 1;
}

/** Drops a consumer, terminating the generation when the last one leaves. */
export function releaseGeneration(): void {
  consumers -= 1;

  if (consumers > 0 || !current) {
    return;
  }

  fail(current, new Error('CSS evaluation generation was released'));
}

/**
 * Discards the generation so that the next request evaluates the complete graph
 * against current file contents. Invalidation is generation-scoped rather than
 * entry-scoped: inside one generation a module already loaded for an earlier
 * entry resolves none of its own imports again, so per-entry attribution is
 * incomplete by construction.
 *
 * **A discard is not a failure and rejects nothing.** A change landing
 * mid-evaluation leaves the loaded modules holding pre-change content and the
 * rest post-change, so the answer in flight is torn rather than merely stale
 * and cannot be published; it is re-issued against the generation succeeding
 * this one instead. Rejection stays reserved for a worker error, a non-zero
 * exit, and the entry's own evaluation throw.
 */
export function discardGeneration(): void {
  if (!current) {
    return;
  }

  const discarded = current;

  // Cleared first: `issue` reads `current`, and a superseded request belongs to
  // the successor rather than to the generation it started in.
  current = undefined;

  for (const [id, request] of discarded.pending) {
    discarded.pending.delete(id);

    if (request.attempts < ATTEMPTS) {
      issue(request);
    } else {
      request.reject(
        new Error(
          `CSS evaluation superseded by concurrent invalidation ${ATTEMPTS} times`,
        ),
      );
    }
  }

  // Nothing is left to drain: every request has moved or failed. The dying
  // worker may still answer one of them, and the answer is dropped by the id
  // lookup that no longer finds it.
  dispose(discarded);
}

export async function evaluate(path: string): Promise<EvaluationResult> {
  return await new Promise<EvaluationResult>((resolve, reject) => {
    issue({ path, attempts: 0, resolve, reject });
  });
}
