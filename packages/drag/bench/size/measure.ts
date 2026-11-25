/* oxlint-disable no-await-in-loop, no-console -- a measurement script: serial, and it prints */
/**
 * Minified, gzip and Brotli size per composition, with Rolldown, from the tree
 * that `just build` emits into the package root.
 *
 * Each row resolves as a consumer of the publication resolves it. An import of a
 * published entry's source, `src/<entry>.ts`, from a row or from a fixture,
 * bundles that entry's emitted file, found through `package.json`'s exports map;
 * an import of any other module under `src/` is an error that names it.
 * `@ydinjs/box-quad` is bundled from its source. An unresolved import, a missing
 * emitted file among them, fails the build, and the module graphs are asserted.
 *
 * Brotli is quality 11 and is what the ceilings gate. gzip is level 9 with zlib's
 * other defaults, and is printed for the record only.
 *
 * `node bench/size/measure.ts` measures the tree as it is, prints the table and
 * exits non-zero on a violation; `aube exec just size` builds first. With
 * `--json` it prints, instead of the table, one JSON array of readings: each
 * row's name, its Brotli and gzip bytes, and its ceiling.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { type Plugin, rolldown } from 'rolldown';
import { publishedEntries } from '../../tests/support/published-entries.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BOX_QUAD = join(ROOT, '../box-quad/src/index.ts');

type Exports = Readonly<Record<string, readonly string[]>>;

export type Composition = Readonly<{
  name: string;
  /** Module path without extension, under `src` or `tests/fixtures`, to named exports. */
  imports: Exports;
  /**
   * The Brotli ceiling. Until the first release of `@ydinjs/drag`, each change the
   * owner approves moves every ceiling, and the control, to its reading
   * (`drag:DRD-68`). After release, a reading over its ceiling is a decision again.
   */
  budget: number;
  /** The exact Brotli figure, for a row that no edit outside its graph may move. */
  control?: number;
  /** Path fragments no module in the graph may contain. */
  absent?: readonly string[];
  /** Path fragments that must appear in the graph. */
  present?: readonly string[];
}>;

const SORTABLE_ONLY = ['sortable'];
const OPTIONAL = ['shared/landing', 'layout-animation'];
const FREE_DRAG_ONLY = ['free-drag'];

export const COMPOSITIONS: readonly Composition[] = [
  {
    name: 'draggable alone',
    imports: { 'src/draggable': ['draggable'] },
    budget: 2189,
    control: 2189,
    absent: [
      'lift',
      'box-quad',
      'rect-index',
      'linear-shift',
      'shared/invalidation',
      ...SORTABLE_ONLY,
      ...FREE_DRAG_ONLY,
      ...OPTIONAL,
    ],
  },
  {
    name: 'draggable + lift',
    imports: { 'src/draggable': ['draggable'], 'src/lift': ['Lifter'] },
    budget: 3932,
    present: ['lift', 'box-quad'],
    absent: [...SORTABLE_ONLY, ...FREE_DRAG_ONLY, ...OPTIONAL],
  },
  {
    name: 'example: resize handle',
    imports: { 'tests/fixtures/resize-handle': ['resizeHandle'] },
    budget: 3265,
    present: ['box-quad'],
    absent: ['lift', ...SORTABLE_ONLY, ...OPTIONAL],
  },
  {
    name: 'example: drop zone',
    imports: { 'tests/fixtures/drop-zone': ['dropZone'] },
    budget: 4570,
    present: ['lift', 'shared/landing'],
    absent: [...SORTABLE_ONLY, 'layout-animation'],
  },
  {
    name: 'example: canvas group',
    imports: { 'tests/fixtures/canvas-group': ['canvasGroup'] },
    budget: 3261,
    present: ['box-quad'],
    absent: ['lift', ...SORTABLE_ONLY, ...OPTIONAL],
  },
  {
    name: 'freeDrag',
    imports: { 'src/free-drag': ['freeDrag'] },
    budget: 4984,
    present: ['lift'],
    absent: [
      ...SORTABLE_ONLY,
      ...OPTIONAL,
      'free-drag/bounds',
      'free-drag/drop-targets',
    ],
  },
  {
    name: 'freeDrag + bounds + landing',
    imports: {
      'src/free-drag': ['freeDrag'],
      'src/free-drag/bounds': ['bounds'],
      'src/free-drag/landing': ['landing'],
    },
    budget: 5465,
    present: ['free-drag/bounds', 'shared/landing'],
    absent: [...SORTABLE_ONLY, 'layout-animation', 'free-drag/drop-targets'],
  },
  {
    name: 'sortable + y',
    imports: { 'src/sortable': ['sortable'], 'src/sortable/y': ['y'] },
    budget: 6689,
    present: ['linear-shift'],
    absent: [...OPTIONAL, 'sortable/xy', ...FREE_DRAG_ONLY],
  },
  {
    name: 'sortable + xy',
    imports: { 'src/sortable': ['sortable'], 'src/sortable/xy': ['xy'] },
    budget: 6641,
    absent: [...OPTIONAL, 'linear-shift', 'sortable/y', ...FREE_DRAG_ONLY],
  },
  {
    name: 'complete',
    imports: {
      'src/sortable': ['sortable'],
      'src/sortable/y': ['y'],
      'src/sortable/landing': ['landing'],
      'src/sortable/layout-animation': ['layoutAnimation'],
    },
    budget: 7489,
    present: [...OPTIONAL, 'linear-shift'],
    absent: FREE_DRAG_ONLY,
  },
];

export type Measurement = Readonly<{
  composition: Composition;
  minified: number;
  gzip: number;
  brotli: number;
  modules: readonly string[];
}>;

function entrySource(imports: Exports, base: string): string {
  const names: string[] = [];
  const lines = Object.entries(imports).map(([path, exported]) => {
    names.push(...exported);
    return `import { ${exported.join(', ')} } from ${JSON.stringify(join(base, `${path}.ts`))};`;
  });

  return `${lines.join('\n')}\nglobalThis.keep = [${names.join(', ')}];\n`;
}

/**
 * Bundles one composition, with `plugins` before Rolldown's own resolution.
 * Module paths are reported relative to `base`.
 */
export async function bundleSize(
  source: string,
  base: string,
  plugins: readonly Plugin[],
): Promise<
  Readonly<{
    minified: number;
    gzip: number;
    brotli: number;
    modules: string[];
  }>
> {
  const directory = await mkdtemp(join(tmpdir(), 'drag-size-'));

  try {
    const input = join(directory, 'entry.js');

    await writeFile(input, source);

    const bundle = await rolldown({
      input,
      platform: 'neutral',
      resolve: { alias: { '@ydinjs/box-quad': BOX_QUAD } },
      plugins: [...plugins],
      onLog(level, log, handler) {
        if (log.code === 'UNRESOLVED_IMPORT') {
          throw new Error(`size: ${log.message}`);
        }

        handler(level, log);
      },
    });

    try {
      const { output } = await bundle.generate({ format: 'es', minify: true });
      const chunks = output.filter((chunk) => chunk.type === 'chunk');
      const bytes = new TextEncoder().encode(
        chunks.map((chunk) => chunk.code).join(''),
      );

      return {
        minified: bytes.byteLength,
        gzip: gzipSync(bytes, { level: 9 }).byteLength,
        brotli: brotliCompressSync(bytes).byteLength,
        modules: chunks.flatMap((chunk) =>
          (Object.keys(chunk.modules) as readonly string[])
            .filter((id) => id !== input)
            .map((id) => relative(base, id)),
        ),
      };
    } finally {
      await bundle.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

const PUBLISHED: readonly Plugin[] = [publishedEntries(ROOT)];

export async function measure(composition: Composition): Promise<Measurement> {
  const result = await bundleSize(
    entrySource(composition.imports, ROOT),
    ROOT,
    PUBLISHED,
  );

  return { composition, ...result };
}

/** What a reading breaks of its ceiling and its control. */
export function ceilingViolations(measurement: Measurement): readonly string[] {
  const { composition, brotli } = measurement;
  const found: string[] = [];

  if (brotli > composition.budget) {
    found.push(
      `over its ${composition.budget} B ceiling by ${brotli - composition.budget} B`,
    );
  }

  if (composition.control !== undefined && brotli !== composition.control) {
    found.push(`control moved by ${brotli - composition.control} B`);
  }

  return found;
}

/** What a reading breaks of its declared graph. */
export function graphViolations(measurement: Measurement): readonly string[] {
  const { composition, modules } = measurement;
  const found: string[] = [];

  for (const fragment of composition.absent ?? []) {
    const leaked = modules.filter((module) => module.includes(fragment));

    if (leaked.length > 0) {
      found.push(`must not contain ${leaked.join(', ')}`);
    }
  }

  for (const fragment of composition.present ?? []) {
    if (!modules.some((module) => module.includes(fragment))) {
      found.push(`must contain ${fragment}`);
    }
  }

  return found;
}

/** What a reading breaks: a ceiling, a control or a declared graph. */
export function violations(measurement: Measurement): readonly string[] {
  return [...ceilingViolations(measurement), ...graphViolations(measurement)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = process.argv.includes('--json');
  const rows: unknown[] = [];
  let failed = 0;

  for (const composition of COMPOSITIONS) {
    const measurement = await measure(composition);
    const found = violations(measurement);

    failed += found.length;

    if (json) {
      rows.push({
        row: composition.name,
        brotli: measurement.brotli,
        gzip: measurement.gzip,
        limit: composition.budget,
      });
      continue;
    }

    console.log(
      `${composition.name.padEnd(30)} ${String(measurement.minified).padStart(6)} min ${String(measurement.gzip).padStart(6)} gz ${String(measurement.brotli).padStart(6)} br  ${measurement.modules.length} modules`,
    );

    for (const line of found) {
      console.log(`  VIOLATION: ${line}`);
    }
  }

  if (json) {
    console.log(JSON.stringify(rows));
  }

  process.exitCode = failed === 0 ? 0 : 1;
}
