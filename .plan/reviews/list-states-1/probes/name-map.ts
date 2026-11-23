// Mirrors .scripts/css/collect-props.ts's glob, loading and naming, and prints
// the map instead of writing the cache. node name-map.ts <tree root>
import { glob, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = pathToFileURL(`${process.argv[2]}/`);
await import(
  new URL('packages/vite-custom-element-assets/css/styles-import.js', root).href
);
const src = new URL('packages/material-x/src/', root);
const registry = new Set<string>();
const files: string[] = [];
for await (const filename of glob(['**/*.css.ts', '**/*.ctr.css'], {
  cwd: fileURLToPath(src),
})) {
  files.push(filename);
  const css = filename.endsWith('css')
    ? await readFile(new URL(filename, src), 'utf8')
    : (await import(fileURLToPath(new URL(filename, src)))).default;
  if (typeof css === 'string')
    for (const [p] of css.matchAll(/(--_[\w-]+)/gu)) registry.add(p);
}
function* letters() {
  const l = 'abcdefghijklmnopqrstuvwxyz';
  for (let n = 1; ; n++) {
    const ix = Array(n).fill(0);
    while (true) {
      yield ix.map((i) => l[i]).join('');
      let c = n - 1;
      while (c >= 0 && ix[c] === 25) c--;
      if (c < 0) break;
      ix[c]++;
      for (let i = c + 1; i < n; i++) ix[i] = 0;
    }
  }
}
const g = letters();
console.log(
  JSON.stringify({
    files,
    names: Object.fromEntries(
      [...registry].map((p) => [p, `--${g.next().value}`]),
    ),
  }),
);
