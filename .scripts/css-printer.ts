import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { JSModule } from './utils.ts';

const {
  positionals: [input],
} = parseArgs({
  allowPositionals: true,
});

if (!input) {
  throw new Error('File path is required');
}

const url = pathToFileURL(input);

const mod: JSModule<string> = await import(url.toString());

await new Promise<void>((resolve, reject) => {
  process.stdout.write(mod.default, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});

process.exit(0);
