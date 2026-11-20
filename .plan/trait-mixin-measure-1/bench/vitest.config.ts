/**
 * The accessor microbenchmark's own Vitest configuration: the repository's
 * browser tooling (Vitest browser mode with Playwright's pinned builds), one
 * engine per run.
 *
 * `BENCH_ENGINE=chromium|firefox|webkit BENCH_OUT=<file.jsonl> aube exec --
 * vitest run --config .plan/trait-mixin-measure-1/bench/vitest.config.ts`
 *
 * One page loads all three variants, so the benchmark can rotate them sample by
 * sample: each variant's material-x modules get their own tag prefix, `mxf-`
 * (flattened), `mxi-` (mixin, inline) and `mxh-` (mixin, helper), and a mixin
 * build's `@ydinjs/core/…` resolves to the same form's core. A mixin build's
 * `CSS.registerProperty` is skipped, because the flattened build, loaded first,
 * has registered the property in the page.
 *
 * Chromium runs with `--allow-natives-syntax`, for `%HaveSameMap` and
 * `%DebugPrint`, which Playwright relays from the browser's output under
 * `DEBUG=pw:browser`. With `BENCH_V8_LOG=<file>` it also writes V8's IC log,
 * which `../probe/ic-log.ts` reads.
 */
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const MIXIN = `${ROOT}.plan/trait-mixin-measure-1/.build/`;
const engine = (process.env['BENCH_ENGINE'] ?? 'chromium') as
  | 'chromium'
  | 'firefox'
  | 'webkit';
const out = process.env['BENCH_OUT'];
const v8Log = process.env['BENCH_V8_LOG'];

/** The variant whose material-x a module belongs to, by its tag prefix. */
function prefixOf(id: string): string | undefined {
  if (id.startsWith(`${ROOT}packages/material-x/`)) {
    return 'mxf';
  }

  return { inline: 'mxi', helper: 'mxh' }[
    /\/\.build\/(inline|helper)\/material-x\//u.exec(id)?.[1] ?? ''
  ];
}

function variants(): Plugin {
  return {
    name: 'trait-mixin-variants',
    enforce: 'pre',
    resolveId(source, importer) {
      const form = /\/trait-mixin-measure-1\/\.build\/(inline|helper)\//u.exec(
        importer ?? '',
      )?.[1];

      return form != null && source.startsWith('@ydinjs/core/')
        ? `${MIXIN}${form}/core/${source.slice('@ydinjs/core/'.length)}`
        : null;
    },
    transform(code, id) {
      const prefix = prefixOf(id);

      if (prefix == null) {
        return null;
      }

      let renamed = code.replaceAll(/(["<\/])mx-/gu, `$1${prefix}-`);

      // A CSS property registers once a page; the flattened variant, loaded
      // first, registers it.
      if (prefix !== 'mxf') {
        renamed = renamed.replaceAll('CSS.registerProperty(', 'void (');
      }

      return { code: renamed, map: null };
    },
  };
}

const record: BrowserCommand<[string]> = async (_context, line) => {
  if (out != null) {
    await appendFile(out, `${line}\n`);
  }
};

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  // Vite's cache goes beside the repository's, not into the record.
  cacheDir: `${ROOT}node_modules/.vite/trait-mixin-measure-1`,
  plugins: [variants()],
  server: { fs: { allow: [ROOT] } },
  define: {
    __ROOT__: JSON.stringify(ROOT),
    __MIXIN__: JSON.stringify(MIXIN),
    __ENGINE__: JSON.stringify(engine),
  },
  test: {
    include: ['*.browser.test.ts'],
    testTimeout: 900_000,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider:
        engine === 'chromium'
          ? playwright({
              launchOptions: {
                channel: 'chromium',
                args:
                  v8Log == null
                    ? ['--js-flags=--allow-natives-syntax']
                    : [
                        `--js-flags=--allow-natives-syntax --log-ic --log-code --logfile=${v8Log} --no-logfile-per-isolate`,
                        // The renderer writes the log, which its sandbox forbids.
                        '--no-sandbox',
                      ],
              },
            })
          : playwright(),
      instances: [{ browser: engine, viewport: { width: 1280, height: 720 } }],
      commands: { record },
    },
  },
});
