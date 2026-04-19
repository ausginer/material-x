import { register } from 'node:module';
import { basename } from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { materialXRoot, root } from '../utils.ts';
import format from './format.ts';
import transform from './transform.ts';

interface JSModule<T> {
  default?: T;
}

const {
  positionals: [file],
} = parseArgs({
  allowPositionals: true,
});

if (!file) {
  throw new Error('Provide CSS TS file to print');
}

register('./styles-import.ts', import.meta.url);

const url = file.startsWith('src/')
  ? new URL(file.slice(4), new URL('src/', materialXRoot))
  : new URL(file, root);

const { default: imported }: JSModule<string> = await import(
  fileURLToPath(url)
);

const fileName = basename(fileURLToPath(url));

const result = await format(
  transform(imported ?? '', fileName).code,
  // Remove TS extension to avoid oxfmt hiccup
  fileName.replace(/\.ts$/, ''),
);
stdout.write(`${result}\n`);
