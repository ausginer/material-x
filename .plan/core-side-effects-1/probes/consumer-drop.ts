// Bundles a bare `import '@ydinjs/core/<module>'` for every module that core's
// `exports` names, with rolldown and esbuild, minified, and prints the bytes
// each bundler keeps. A module a bundler can drop keeps 0 bytes.
// Run once with core's package.json as it is and once with the field changed.
// Usage: node consumer-drop.ts <repository root>
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2]!);
const consumer = join(root, 'packages/material-x');
const require = createRequire(join(consumer, 'package.json'));
const { rolldown } = require('rolldown');
const esbuild = require(require.resolve('esbuild', { paths: [root] }));
const pkg = JSON.parse(
  await readFile(join(root, 'packages/core/package.json'), 'utf8'),
);
const dir = join(consumer, 'node_modules/.cache/side-effects-probe');
await mkdir(dir, { recursive: true });

console.log(`sideEffects: ${JSON.stringify(pkg.sideEffects)}`);
console.log('module rolldown-ignoring rolldown esbuild');
for (const [key, target] of Object.entries(pkg.exports) as Array<
  [string, { default?: string }]
>) {
  if (!target.default) continue;
  const specifier = `@ydinjs/core/${key.slice(2)}`;
  const entry = join(dir, 'entry.js');
  await writeFile(entry, `import ${JSON.stringify(specifier)};\n`);

  const rolldownBytes = async (treeshake?: object): Promise<number> => {
    const bundle = await rolldown({
      input: entry,
      platform: 'neutral',
      cwd: consumer,
      treeshake,
    });
    const { output } = await bundle.generate({ format: 'es', minify: true });
    await bundle.close();
    return output
      .filter((c: { type: string }) => c.type === 'chunk')
      .reduce((n: number, c: { code: string }) => n + c.code.trim().length, 0);
  };
  const ignoring = await rolldownBytes({ moduleSideEffects: () => true });
  const reading = await rolldownBytes();

  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    platform: 'neutral',
    absWorkingDir: consumer,
    logLevel: 'silent',
  });
  const esbuildBytes = result.outputFiles.reduce(
    (n: number, f: { text: string }) => n + f.text.trim().length,
    0,
  );
  console.log(`${key.slice(2)} ${ignoring} ${reading} ${esbuildBytes}`);
}
await rm(dir, { recursive: true, force: true });
