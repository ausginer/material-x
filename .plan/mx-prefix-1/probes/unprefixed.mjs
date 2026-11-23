// Run from packages/material-x, built:
//   node ../../.plan/mx-prefix-1/probes/unprefixed.mjs [names.json]
// Reads every built JavaScript file and lists each custom property name in it
// that is neither public (`--md-*`) nor prefixed (`--mx-*`). Comments and source
// maps are not read. `names.json` is a map whose values must be absent too.
import { glob, readFile } from 'node:fs/promises';
import files from '../../../packages/material-x/package.json' with { type: 'json' };
const dirs = files.files.filter((f) => !f.includes('.'));
const built = new Set(
  Object.values(
    JSON.parse(
      await readFile(
        '../../node_modules/.cache/css/css-private-props.json',
        'utf8',
      ),
    ),
  ),
);
const old = process.argv[2]
  ? new Set(Object.values(JSON.parse(await readFile(process.argv[2], 'utf8'))))
  : new Set();
const seen = new Map();
const oldSeen = new Set();
let count = 0;
for await (const file of glob([
  'core/**/*.js',
  ...dirs.map((d) => `${d}/**/*.js`),
])) {
  count += 1;
  const code = (await readFile(file, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
  for (const [name] of code.matchAll(/(?<![\w-])--[\w-]+/gu)) {
    if (old.has(name)) oldSeen.add(`${name} in ${file}`);
    if (!seen.has(name)) seen.set(name, file);
  }
}
const names = [...seen.keys()];
console.log(
  `${count} files, ${names.length} names; ${names.filter((n) => built.has(n)).length} of the map's ${built.size}; the map's values without --mx-: ${[...built].filter((n) => !n.startsWith('--mx-')).length}`,
);
console.log(
  `names that are neither --md-* nor --mx-*: ${
    names
      .filter((n) => !/^--(md|mx)-/u.test(n))
      .map((n) => `${n} (${seen.get(n)})`)
      .join(', ') || 'none'
  }`,
);
console.log(
  `--mx-* names not in the map: ${names.filter((n) => n.startsWith('--mx-') && !built.has(n)).join(', ') || 'none'}`,
);
if (process.argv[2])
  console.log(
    `names of ${process.argv[2].split('/').at(-1)} in the files: ${[...oldSeen].join(', ') || 'none'}`,
  );
