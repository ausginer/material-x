/**
 * RF-63's closure reading at the last commit: each of the eight entries whose
 * element is a FocusForwarding adopter, from material-x's built output, bundled
 * minified with rolldown and with esbuild.
 *
 * For each bundle it records the bytes, and how many trait classes it keeps,
 * counted by their generated `[Symbol.hasInstance]` method. FocusForwarding's
 * class isn't in material-x's built output at all: no component references
 * it, and its module isn't an entry, so the library build drops it. A second
 * bundle of the same entry adds `element instanceof Disableable`, a trait
 * every adopter has and core publishes, and Chromium reads it with a plain
 * element and `null` for comparison, so a bundle that keeps a trait class is
 * checked at runtime.
 *
 * Build core and material-x first. Run from the repository root:
 * `node .plan/trait-migration-1/checks/rf63-adopters.ts`
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(join(root, 'packages/material-x/package.json'));
const { rolldown } = require('rolldown') as typeof import('rolldown');
const esbuild = require('esbuild') as typeof import('esbuild');
const { chromium } = require('playwright') as typeof import('playwright');

const ADOPTERS = [
  ['button/button', 'mx-button'],
  ['button/icon-button', 'mx-icon-button'],
  ['button/link-button', 'mx-link-button'],
  ['button/switch-button', 'mx-switch-button'],
  ['button/switch-icon-button', 'mx-switch-icon-button'],
  ['fab/fab', 'mx-fab'],
  ['list/list-button-item', 'mx-list-button-item'],
  ['list/list-link-item', 'mx-list-link-item'],
] as const;

const pkg = join(root, 'packages/material-x');
const scratch = await mkdtemp(join(pkg, 'node_modules/.rf63-'));

async function bundleWith(bundler: string, entry: string): Promise<string> {
  if (bundler === 'rolldown') {
    const bundle = await rolldown({ input: entry, logLevel: 'silent' });
    const { output } = await bundle.generate({ format: 'esm', minify: true });
    return output
      .map((chunk) => ('code' in chunk ? chunk.code : ''))
      .join('\n');
  }
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
    loader: { '.css': 'text' },
  });
  return result.outputFiles.map((file) => file.text).join('\n');
}

const browser = await chromium.launch();

const lines: string[] = [];
try {
  for (const [entry, tag] of ADOPTERS) {
    const plain = join(scratch, `${entry.replace('/', '-')}.js`);
    const checked = join(scratch, `${entry.replace('/', '-')}.check.js`);
    await writeFile(plain, `import '@ydinjs/material-x/${entry}.js';\n`);
    await writeFile(
      checked,
      `import '@ydinjs/material-x/${entry}.js';
import { Disableable } from '@ydinjs/core/traits/disableable.js';
globalThis.rf63 = [document.createElement('${tag}') instanceof Disableable, document.createElement('div') instanceof Disableable, null instanceof Disableable];
`,
    );
    for (const bundler of ['rolldown', 'esbuild']) {
      // oxlint-disable-next-line no-await-in-loop
      const code = await bundleWith(bundler, plain);
      // oxlint-disable-next-line no-await-in-loop
      const check = await bundleWith(bundler, checked);
      const kept = code.match(/\[Symbol\.hasInstance\]/gu)?.length ?? 0;
      const keptWithCheck =
        check.match(/\[Symbol\.hasInstance\]/gu)?.length ?? 0;
      // Each bundle registers the same custom properties, so each runs in a
      // page of its own.
      // oxlint-disable-next-line no-await-in-loop
      const page = await browser.newPage();
      // oxlint-disable-next-line no-await-in-loop
      const result = await page.evaluate(async (source) => {
        const url = URL.createObjectURL(
          new Blob([source], { type: 'text/javascript' }),
        );
        await import(url);
        return (globalThis as { rf63?: unknown }).rf63;
      }, check);
      lines.push(
        `${entry} (${bundler}): ${code.length} B min, ${brotliCompressSync(code).length} B brotli; trait classes kept: ${kept}; with instanceof: ${keptWithCheck} kept, [adopter, div, null] instanceof Disableable = ${JSON.stringify(result)}`,
      );
    }
  }
} finally {
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
}

console.log(lines.join('\n'));
