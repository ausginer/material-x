import { parentPort, workerData } from 'node:worker_threads';
import type { JSModule } from '../utils.ts';

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const { id } = workerData as Readonly<{ id: string }>;

const mod: JSModule<string> = await import(id);

parentPort?.postMessage(mod.default);
