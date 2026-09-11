import { fileURLToPath } from 'node:url';
import { MessageChannel, Worker, type MessagePort } from 'node:worker_threads';

type Pending = Readonly<{
  resolve(code: string): void;
  reject(error: Error): void;
}>;

type Response = Readonly<{
  id: number;
  code?: string;
  message?: string;
  stack?: string;
}>;

type Generation = Readonly<{
  worker: Worker;
  monitor: MessagePort;
  deps: Set<string>;
  pending: Map<number, Pending>;
}>;

export type EvaluationResult = Readonly<{
  code: string;
  /** Every file the generation has resolved so far. */
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
let requests = 0;

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

  for (const { reject } of generation.pending.values()) {
    reject(error);
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
  const generation: Generation = { worker, monitor: port1, deps, pending };

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
        request.resolve(response.code ?? '');
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
 */
export function discardGeneration(): void {
  if (current) {
    fail(current, new Error('CSS evaluation generation was discarded'));
  }
}

export async function evaluate(path: string): Promise<EvaluationResult> {
  current ??= create();

  const generation = current;
  const id = (requests += 1);
  const code = await new Promise<string>((resolve, reject) => {
    generation.pending.set(id, { resolve, reject });
    generation.worker.postMessage({ id, path });
  });

  return { code, deps: new Set(generation.deps) };
}
