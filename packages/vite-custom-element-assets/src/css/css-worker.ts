import { parentPort, workerData } from 'node:worker_threads';
import type { JSModule } from '../utils.ts';

const { id } = workerData as Readonly<{ id: string }>;

const mod: JSModule<string> = await import(id);

parentPort?.postMessage(mod.default);
