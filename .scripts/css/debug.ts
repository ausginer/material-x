import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { transform } from 'lightningcss';
import { format, type FormatOptions } from 'oxfmt';
import oxfmtConfig from '../../.oxfmtrc.json' with { type: 'json' };
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
const { code, errors } = await format(
  'f.css',
  result,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  oxfmtConfig as FormatOptions,
);

if (errors.length > 0) {
  throw new Error('CSS prettification failed', { cause: errors });
}
console.log(code);
