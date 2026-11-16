/**
 * Each pattern that item 5 gave a `u` flag, before and after, over every path
 * that the `glob` below returns from the repository root (relative, absolute,
 * with a leading and with a trailing slash) and the edge strings below. A pattern matches the same strings if `test`,
 * `replace` and every match index agree on every input.
 */
import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';

const PATTERNS: readonly (readonly [string, RegExp, RegExp])[] = [
  ['vite-custom-element-assets css.ts:31', /\.ts$/, /\.ts$/u],
  ['vite-custom-element-assets index.ts:237', /\.(?:ts|tsx)/, /\.(?:ts|tsx)/u],
  ['vite-custom-element-assets index.ts:238', /\.css\.ts/, /\.css\.ts/u],
  ['size-limit-preset-rolldown tsdown.config.ts:16', /^rolldown/, /^rolldown/u],
  [
    'size-limit-preset-rolldown tsdown.config.ts:16',
    /^@rolldown/,
    /^@rolldown/u,
  ],
  ['material-x tsdown.config.ts:12', /node_modules/, /node_modules/u],
  ['.storybook/docs/paths.ts:6', /^\/+/, /^\/+/u],
  ['.scripts/docs-api.ts:17', /\/?$/, /\/?$/u],
  ['.scripts/css/debug.ts:39', /\.ts$/, /\.ts$/u],
  ['.scripts/vite-config.ts:74', /\.css\.ts/, /\.css\.ts/u],
];

const EDGES = [
  '',
  '/',
  '//a',
  'a/',
  'x.ts',
  'x.tsx',
  'x.css.ts',
  'rolldown',
  '@rolldown/x',
  '😀.ts',
  '\uD83D.ts',
  'a\uDE00/',
  'é.ts',
];

const inputs: string[] = [...EDGES];

for await (const path of glob('**/*', { cwd: process.cwd() })) {
  inputs.push(path, resolve(path), `/${path}`, `${path}/`);
}

for (const [site, before, after] of PATTERNS) {
  let differing = 0;

  for (const input of inputs) {
    const a = before.exec(input);
    const b = after.exec(input);

    if (
      before.test(input) !== after.test(input) ||
      input.replace(before, '#') !== input.replace(after, '#') ||
      a?.index !== b?.index ||
      a?.[0] !== b?.[0]
    ) {
      differing += 1;
    }
  }

  console.log(`${site}: ${differing} of ${inputs.length} inputs differ`);
}
