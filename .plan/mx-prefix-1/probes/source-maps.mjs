// Run from packages/material-x, built:
//   node ../../.plan/mx-prefix-1/probes/source-maps.mjs
// Reads the `sourcesContent` of every built source map, and counts the maps that
// hold published names (`--mx-*`) and the maps that hold source names (`--_*`),
// by the kind of the map's source.
import { glob, readFile } from 'node:fs/promises';
import manifest from '../../../packages/material-x/package.json' with { type: 'json' };
const dirs = manifest.files.filter((f) => !f.includes('.'));
const kinds = { published: {}, source: {}, both: {}, neither: {} };
let count = 0;
let shortNames = 0;
for await (const file of glob([
  'core/**/*.js.map',
  ...dirs.map((d) => `${d}/**/*.js.map`),
])) {
  count += 1;
  const { sources, sourcesContent } = JSON.parse(await readFile(file, 'utf8'));
  const text = sourcesContent.join('\n');
  const published = /(?<![\w-])--mx-[a-z]/u.test(text);
  const source = /(?<![\w-])--_\w/u.test(text);
  if (/(?<![\w-])--[a-z]{1,2}(?![\w-])/u.test(text)) shortNames += 1;
  const holds = published
    ? source
      ? 'both'
      : 'published'
    : source
      ? 'source'
      : 'neither';
  const kind = sources
    .map((s) => /(?:\.ctr)?\.[a-z]+$/u.exec(s)?.[0])
    .join(' ');
  kinds[holds][kind] = (kinds[holds][kind] ?? 0) + 1;
}
console.log(`${count} maps, by what their sourcesContent holds:`);
for (const [holds, counts] of Object.entries(kinds))
  console.log(holds, JSON.stringify(counts));
console.log(
  `maps with a -- name of one or two letters and no prefix: ${shortNames}`,
);
