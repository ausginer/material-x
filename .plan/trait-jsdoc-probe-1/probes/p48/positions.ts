// P48: where rolldown reports a plugin diagnostic, with and without the load
// rewrite. Usage: node positions.ts <worktree> <file> (P48_LOAD=0|1).
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, rel, from, to] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
];
const { viteTraitsPlugin } = await import(
  pathToFileURL(resolve(root, 'packages/vite-traits-plugin/src/plugin.ts')).href
);
const { rolldown } = await import(
  pathToFileURL(resolve(root, 'node_modules/rolldown/dist/index.mjs')).href
);
const file = resolve(root, rel);
const original = await readFile(file, 'utf8');
await writeFile(file, original.replace(from, to));
try {
  const bundle = await rolldown({
    input: file,
    plugins: viteTraitsPlugin(),
    external: (id: string) => !id.startsWith('/') && !id.startsWith('.'),
  });
  await bundle.generate({});
  console.log('no error');
} catch (error) {
  const e =
    (error as { errors?: Array<Record<string, unknown>> }).errors?.[0] ??
    (error as Record<string, unknown>);
  console.log(String(e.message).split('\n')[0]);
  console.log('loc', JSON.stringify(e.loc), 'pos', e.pos);
  if (e.frame) console.log(e.frame);
} finally {
  await writeFile(file, original);
}
