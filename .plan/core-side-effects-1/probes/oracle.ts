// Which rolldown setting still sees a real top-level effect in a package that
// declares `"sideEffects": false`. Writes a fixture package `fx` with three
// modules and bundles a bare import of each, minified, under four settings.
// Usage: node oracle.ts <repository root>
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2]!);
const { rolldown } = createRequire(join(root, 'package.json'))('rolldown');
const dir = join(root, 'node_modules/.cache/side-effects-oracle');
const fx = join(dir, 'node_modules/fx');
await mkdir(fx, { recursive: true });
await writeFile(
  join(fx, 'package.json'),
  JSON.stringify({ name: 'fx', type: 'module', sideEffects: false }),
);
const modules: Record<string, string> = {
  pure: 'export const a = 1;',
  global: 'globalThis.x = 1; export const b = 2;',
  define:
    'export class C extends HTMLElement {} customElements.define("x-c", C);',
};
for (const [name, code] of Object.entries(modules))
  await writeFile(join(fx, `${name}.js`), code);

const settings: Record<string, object | undefined> = {
  default: undefined,
  'moduleSideEffects: true': { moduleSideEffects: true },
  "moduleSideEffects: 'no-external'": { moduleSideEffects: 'no-external' },
  'moduleSideEffects: () => true': { moduleSideEffects: () => true },
};
for (const name of Object.keys(modules)) {
  const row: string[] = [];
  for (const [label, treeshake] of Object.entries(settings)) {
    const bundle = await rolldown({
      input: 'entry',
      cwd: dir,
      platform: 'neutral',
      treeshake,
      plugins: [
        {
          name: 'entry',
          resolveId: (id: string) => (id === 'entry' ? id : null),
          load: (id: string) =>
            id === 'entry' ? `import "fx/${name}.js";` : null,
        },
      ],
    });
    const { output } = await bundle.generate({ format: 'es', minify: true });
    await bundle.close();
    row.push(`${label} → ${output[0].code.trim().length}`);
  }
  console.log(`${name}.js: ${row.join(' | ')}`);
}
await rm(dir, { recursive: true, force: true });
