/**
 * Property 8's size reading: an application build of one real entry,
 * `connected-button-group`, minified, without and with the plugin, as the
 * repair verification's V-W2 reads it. With the plugin, the build deletes the
 * instance members of the trait classes that the bundle keeps; size-limit's
 * rows can't see that, because its preset bundles without the plugin.
 *
 * Build core and material-x first. Run from the repository root:
 * `node .plan/trait-migration-1/checks/property8-size.ts`
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const pkg = join(root, 'packages/material-x');
const require = createRequire(join(pkg, 'package.json'));
const { build } = require('vite') as typeof import('vite');
const { viteTraitsPlugin } = (await import(
  join(root, 'packages/vite-traits-plugin/src/plugin.ts')
)) as typeof import('../../../packages/vite-traits-plugin/src/plugin.ts');

const dir = await mkdtemp(join(pkg, 'node_modules/.property8-'));
try {
  await writeFile(
    join(dir, 'entry.js'),
    "import '@ydinjs/material-x/button-group/connected-button-group.js';\n",
  );
  for (const withPlugin of [false, true]) {
    // oxlint-disable-next-line no-await-in-loop
    const result = (await build({
      root: dir,
      configFile: false,
      logLevel: 'silent',
      plugins: withPlugin ? [viteTraitsPlugin()] : [],
      build: {
        write: false,
        minify: true,
        rolldownOptions: { input: join(dir, 'entry.js') },
      },
    })) as { output: Array<{ type: string; code?: string }> };
    const code = result.output
      .filter((chunk) => chunk.type === 'chunk')
      .map((chunk) => chunk.code ?? '')
      .join('\n');
    console.log(
      `connected-button-group, application build, minified, ${withPlugin ? 'with' : 'without'} the plugin: ${Buffer.byteLength(code)} B, ${brotliCompressSync(code).length} B brotli`,
    );
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
