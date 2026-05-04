// oxlint-disable no-console
/* eslint-disable import-x/no-relative-packages */
import { register } from 'node:module';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import processTokenSet from '../../packages/material-x/src/.tproc/processTokenSet.ts';
import { materialXRoot, root } from '../utils.ts';
import format from './format.ts';
import transform from './transform.ts';

interface JSModule<T> {
  default?: T;
}

const {
  positionals: [file],
  values: { set },
} = parseArgs({
  options: {
    set: { type: 'string' },
  },
  allowPositionals: true,
});

if (file) {
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
  console.log(result);
} else if (set) {
  const result = processTokenSet(set);
  console.log(result);
} else {
  throw new Error('Provide CSS TS file or set name to print');
}
