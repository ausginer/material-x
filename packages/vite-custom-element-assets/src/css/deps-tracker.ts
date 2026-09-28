import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MessagePort, workerData } from 'node:worker_threads';

const { monitorPort } =
  (workerData as { monitorPort: MessagePort } | undefined) ?? {};

if (monitorPort instanceof MessagePort) {
  registerHooks({
    // The URL `nextResolve` returns, filtered to `file:` and to nothing else.
    // Reporting the specifier instead misses every input reached through a
    // bare specifier — a workspace dependency resolves through its symlink to
    // a real path in the tree, and its built artefacts and JSON data are
    // module-graph inputs like any other.
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context);

      if (resolved.url.startsWith('file:')) {
        monitorPort.postMessage(fileURLToPath(resolved.url));
      }

      return resolved;
    },
  });
}
