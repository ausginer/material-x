import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { transform } from 'lightningcss';
import * as prettier from 'prettier';
import { root } from '../utils.ts';

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

const url = new URL(file, root);

const { default: imported }: JSModule<string> = await import(
  fileURLToPath(url)
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const { code: encoded } = transform({
  filename: basename(fileURLToPath(url)),
  code: encoder.encode(imported),
  minify: true,
});

const result = decoder.decode(encoded);
const prettified = await prettier.format(result, { parser: 'css' });
console.log(prettified);
