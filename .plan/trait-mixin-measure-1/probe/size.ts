/**
 * Bundles material-x's runtime entries as a consumer's bundler does, flattened
 * (the packages' own build) against the two mixin forms of `build-mixin.ts`
 * (`inline` and `helper`), and prints raw, gzip and Brotli bytes. The bundling is size-limit-preset-rolldown's:
 * Rolldown, `platform: 'neutral'`, ES output, minified, no plugins, so none of
 * our plugins runs in the consumer. gzip is level 9 and Brotli quality 11, as
 * `@size-limit/file` measures.
 *
 * Rows:
 * - `complete`: one module that imports every runtime entry, size-limit's
 *   `complete` row;
 * - `complete + instanceof X`: `complete` plus a module that imports core's
 *   trait X and exports `(o) => o instanceof X`, the consumer that keeps a
 *   trait class;
 * - each runtime entry alone.
 *
 * `node .plan/trait-mixin-measure-1/probe/size.ts [--json]`, after the packages'
 * builds and `build-mixin.ts`.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { rolldown, type Plugin } from 'rolldown';
import files from '../../../packages/material-x/files.json' with { type: 'json' };

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const MIXIN = `${ROOT}.plan/trait-mixin-measure-1/.build/`;

const VARIANTS = ['flattened', 'inline', 'helper'] as const;

type Variant = (typeof VARIANTS)[number];

const ROOTS: Readonly<Record<Variant, Readonly<{ core: string; mx: string }>>> =
  {
    flattened: {
      core: `${ROOT}packages/core/`,
      mx: `${ROOT}packages/material-x/`,
    },
    inline: { core: `${MIXIN}inline/core/`, mx: `${MIXIN}inline/material-x/` },
    helper: { core: `${MIXIN}helper/core/`, mx: `${MIXIN}helper/material-x/` },
  };

/** Sends `@ydinjs/core/…` to the variant's core. */
function coreAlias(core: string): Plugin {
  return {
    name: 'core-alias',
    resolveId(source) {
      return source.startsWith('@ydinjs/core/')
        ? `${core}${source.slice('@ydinjs/core/'.length)}`
        : null;
    },
  };
}

const CORE_TRAITS = [
  ['Disableable', 'disableable'],
  ['Nameable', 'nameable'],
  ['Typeable', 'typeable'],
  ['Checkable', 'checkable'],
  ['Valuable', 'valuable'],
  ['Selectable', 'selectable'],
  ['Linkable', 'linkable'],
  ['Reorderable', 'reorderable'],
] as const;

type Row = Readonly<{
  row: string;
  variant: Variant;
  raw: number;
  gzip: number;
  brotli: number;
}>;

async function measure(
  variant: Variant,
  row: string,
  entry: string,
): Promise<Row> {
  const dir = await mkdtemp(join(tmpdir(), 'trait-mixin-size-'));

  try {
    const input = join(dir, 'entry.js');
    await writeFile(input, entry);
    const bundle = await rolldown({
      input,
      platform: 'neutral',
      plugins: variant === 'flattened' ? [] : [coreAlias(ROOTS[variant].core)],
      logLevel: 'silent',
    });
    const { output } = await bundle.write({
      dir: join(dir, 'dist'),
      format: 'es',
      minify: true,
    });
    await bundle.close();

    let raw = 0;
    let gzip = 0;
    let brotli = 0;

    for (const chunk of output) {
      if (chunk.type !== 'chunk' && !chunk.fileName.endsWith('.css')) {
        continue;
      }

      const bytes = await readFile(join(dir, 'dist', chunk.fileName));
      raw += bytes.length;
      gzip += gzipSync(bytes, { level: 9 }).length;
      brotli += brotliCompressSync(bytes, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length;
    }

    return { row, variant, raw, gzip, brotli };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function importsOf(variant: Variant, entries: readonly string[]): string {
  return entries
    .map(
      (entry) =>
        `import ${JSON.stringify(`${ROOTS[variant].mx}${entry}.js`)};\n`,
    )
    .join('');
}

function instanceOf(
  variant: Variant,
  traits: (typeof CORE_TRAITS)[number][],
): string {
  return traits
    .map(
      ([name, file]) =>
        `import { ${name} } from ${JSON.stringify(`${ROOTS[variant].core}traits/${file}.js`)};\n` +
        `export const is${name} = (o) => o instanceof ${name};\n`,
    )
    .join('');
}

const rows: Row[] = [];

for (const variant of VARIANTS) {
  const complete = importsOf(variant, files.runtime);
  rows.push(await measure(variant, 'complete', complete));
  rows.push(
    await measure(
      variant,
      'complete + instanceof Disableable',
      complete + instanceOf(variant, [CORE_TRAITS[0]]),
    ),
  );
  rows.push(
    await measure(
      variant,
      'complete + instanceof each core trait (8)',
      complete + instanceOf(variant, [...CORE_TRAITS]),
    ),
  );

  for (const entry of files.runtime) {
    rows.push(await measure(variant, entry, importsOf(variant, [entry])));
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const names = [...new Set(rows.map((r) => r.row))];
  const d = (a: number, b: number) => `${b - a >= 0 ? '+' : ''}${b - a}`;

  for (const measure of ['raw', 'gzip', 'brotli'] as const) {
    console.log(`\n${measure}\n`);
    console.log('| Row | Flattened | Mixin, inline | Δ | Mixin, helper | Δ |');
    console.log('| --- | --: | --: | --: | --: | --: |');

    for (const name of names) {
      const [f, i, h] = VARIANTS.map(
        (variant) =>
          rows.find((r) => r.row === name && r.variant === variant)![measure],
      );
      console.log(`| ${name} | ${f} | ${i} | ${d(f, i)} | ${h} | ${d(f, h)} |`);
    }
  }
}
