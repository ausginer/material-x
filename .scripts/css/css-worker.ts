import { pathToFileURL } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';
import type { JSModule } from '../utils.ts';

const url = pathToFileURL(workerData);

const mod: JSModule<string> = await import(url.toString());

parentPort?.postMessage(mod.default);
