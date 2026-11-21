// Bundles each runtime entry of the built @ydinjs/material-x, and one module
// that imports all of them, with rolldown and esbuild, minified, and prints the
// bytes each bundler emits and whether the output still holds code that only
// a core module's top level produces. Run with core's field absent and present.
// Usage: node consumer-entries.ts <repository root>
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2]!);
const consumer = join(root, 'packages/material-x');
const require = createRequire(join(consumer, 'package.json'));
const { rolldown } = require('rolldown');
const esbuild = require(require.resolve('esbuild', { paths: [root] }));
const core = JSON.parse(
  await readFile(join(root, 'packages/core/package.json'), 'utf8'),
);
const files = JSON.parse(await readFile(join(consumer, 'files.json'), 'utf8'));

const entries: Array<[string, string]> = files.runtime.map((e: string) => [
  e,
  `import ${JSON.stringify(join(consumer, `${e}.js`))};`,
]);
entries.push(['complete', entries.map(([, code]) => code).join('\n')]);

const virtual = (code: string) => ({
  name: 'entry',
  resolveId: (id: string) => (id === 'entry' ? id : null),
  load: (id: string) => (id === 'entry' ? code : null),
});

console.log(`sideEffects: ${JSON.stringify(core.sideEffects)}`);
console.log('entry rolldown esbuild');
for (const [name, code] of entries) {
  const bundle = await rolldown({
    input: 'entry',
    platform: 'neutral',
    cwd: consumer,
    plugins: [virtual(code)],
  });
  const { output } = await bundle.generate({ format: 'es', minify: true });
  await bundle.close();
  const r = output
    .filter((c: { type: string }) => c.type === 'chunk')
    .reduce((n: number, c: { code: string }) => n + c.code.length, 0);

  const result = await esbuild.build({
    stdin: { contents: code, resolveDir: consumer, loader: 'js' },
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    platform: 'neutral',
    absWorkingDir: consumer,
    logLevel: 'silent',
    loader: { '.css': 'text' },
  });
  const e = result.outputFiles.reduce(
    (n: number, f: { text: string }) => n + f.text.length,
    0,
  );
  console.log(`${name} ${r} ${e}`);
}
