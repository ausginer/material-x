import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { workerData, MessagePort } from 'node:worker_threads';

const { monitorPort } =
  (workerData as { monitorPort: MessagePort } | undefined) ?? {};

if (monitorPort instanceof MessagePort) {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('.')) {
        const url = new URL(specifier, context.parentURL);
        if (!url.pathname.includes('node_modules')) {
          monitorPort.postMessage(fileURLToPath(url));
        }
      }

      return nextResolve(specifier, context);
    },
  });
}
