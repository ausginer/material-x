import { register } from 'node:module';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { root } from '../utils.ts';
import format from './format.ts';
import transform from './transform.ts';
import { injectStateEnforcer } from './css-docs.ts';

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

const url = new URL(file, root);

const { default: imported }: JSModule<string> = await import(
  fileURLToPath(url)
);

const fileName = basename(fileURLToPath(url));

const result = await format(
  transform(imported ?? '', fileName, { visitor: injectStateEnforcer() }).code,
  // Remove TS extension to avoid oxfmt hiccup
  fileName.replace(/\.ts$/, ''),
);
console.log(result);
