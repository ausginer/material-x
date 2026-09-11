import { parentPort } from 'node:worker_threads';
import type { JSModule } from '../utils.ts';

type Request = Readonly<{
  id: number;
  path: string;
}>;

// The listener is what holds the isolate open across a generation's requests.
parentPort?.on('message', ({ id, path }: Request) => {
  import(path).then(
    (mod: JSModule<string>) => {
      parentPort?.postMessage({ id, code: mod.default });
    },
    (error: unknown) => {
      parentPort?.postMessage(
        error instanceof Error
          ? { id, message: error.message, stack: error.stack }
          : { id, message: String(error) },
      );
    },
  );
});
