import { register, type ResolveHook } from 'node:module';
import { fileURLToPath } from 'node:url';
import { workerData, MessagePort } from 'node:worker_threads';

export type DependencyInfo = Readonly<{
  module: string;
  importer: string;
}>;

const { monitorPort } =
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  (workerData as { monitorPort: MessagePort } | undefined) ?? {};

if (monitorPort instanceof MessagePort) {
  register(import.meta.url, {
    data: { port: monitorPort },
    transferList: [monitorPort],
  });
}

let reportPort: MessagePort | null = null;

export function initialize(data: { port: MessagePort }): void {
  reportPort = data.port;
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  if (reportPort && specifier.startsWith('.')) {
    const url = new URL(specifier, context.parentURL);
    if (!url.pathname.includes('node_modules')) {
      reportPort.postMessage(fileURLToPath(url));
    }
  }

  return await nextResolve(specifier, context);
};
