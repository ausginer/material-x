// Probe of the RF-70 feature proof (PR #120): in collect-props.ts's file order,
// which stylesheet first mentions --_elevation-penumbra? Mirrors the script's
// glob and loading. Run from the tree's root with `aube exec node <this> <root>`.
import { glob, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = pathToFileURL(`${process.argv[2]}/`);
await import(
  new URL('packages/vite-custom-element-assets/css/styles-import.js', root).href
);
const src = new URL('packages/material-x/src/', root);
let i = 0;
for await (const filename of glob(['**/*.css.ts', '**/*.ctr.css'], {
  cwd: fileURLToPath(src),
})) {
  const css = filename.endsWith('css')
    ? await readFile(new URL(filename, src), 'utf8')
    : (await import(fileURLToPath(new URL(filename, src)))).default;
  if (typeof css === 'string' && css.includes('--_elevation-penumbra')) {
    console.log(
      `file #${i} ${filename} is the first to mention --_elevation-penumbra`,
    );
    break;
  }
  i += 1;
}
