/* oxlint-disable no-await-in-loop, no-console -- a measurement script: serial, and it prints */
/* eslint-disable @typescript-eslint/strict-void-return -- `promisify` takes the callback form as it is */
/**
 * Minified and Brotli size per composition, with Rolldown, as drag2's harness does.
 * An unresolved import fails the build, and the module graphs are asserted.
 *
 * `node bench/size/measure.ts` prints the table and exits non-zero on a violation.
 * `--prototype` also measures the prototype at its revision, read with `git archive`.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompressSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const execFile = promisify(execFileCallback);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BOX_QUAD = join(ROOT, '../box-quad/src/index.ts');
const PROTOTYPE_REVISION = '599684791';

type Exports = Readonly<Record<string, readonly string[]>>;

export type Composition = Readonly<{
  name: string;
  /** Module path without extension, under `src` or `tests/fixtures`, to named exports. */
  imports: Exports;
  /** The Brotli ceiling. Its slack over the reading is what the row can detect. */
  budget: number;
  /** The exact Brotli figure, for a row that no edit outside its graph may move. */
  control?: number;
  /** Path fragments no module in the graph may contain. */
  absent?: readonly string[];
  /** Path fragments that must appear in the graph. */
  present?: readonly string[];
}>;

const SORTABLE_ONLY = ['src/sortable'];
const OPTIONAL = ['shared/landing', 'layout-animation'];
const FREE_DRAG_ONLY = ['src/free-drag'];

export const COMPOSITIONS: readonly Composition[] = [
  {
    name: 'draggable alone',
    imports: { 'src/draggable': ['draggable'] },
    budget: 2139,
    control: 2024,
    absent: [
      'src/lift',
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
    imports: { 'src/draggable': ['draggable'], 'src/lift': ['createLifter'] },
    budget: 4169,
    present: ['src/lift', 'box-quad'],
    absent: [...SORTABLE_ONLY, ...FREE_DRAG_ONLY, ...OPTIONAL],
  },
  {
    name: 'example: resize handle',
    imports: { 'tests/fixtures/resize-handle': ['resizeHandle'] },
    budget: 3313,
    present: ['box-quad'],
    absent: ['src/lift', ...SORTABLE_ONLY, ...OPTIONAL],
  },
  {
    name: 'example: drop zone',
    imports: { 'tests/fixtures/drop-zone': ['dropZone'] },
    budget: 4431,
    present: ['src/lift'],
    absent: [...SORTABLE_ONLY, ...OPTIONAL],
  },
  {
    name: 'example: canvas group',
    imports: { 'tests/fixtures/canvas-group': ['canvasGroup'] },
    budget: 3314,
    present: ['box-quad'],
    absent: ['src/lift', ...SORTABLE_ONLY, ...OPTIONAL],
  },
  {
    name: 'freeDrag',
    imports: { 'src/free-drag': ['freeDrag'] },
    budget: 4967,
    present: ['src/lift'],
    absent: [...SORTABLE_ONLY, ...OPTIONAL, 'free-drag/bounds'],
  },
  {
    name: 'freeDrag + bounds + landing',
    imports: {
      'src/free-drag': ['freeDrag'],
      'src/free-drag/bounds': ['bounds'],
      'src/free-drag/landing': ['landing'],
    },
    budget: 5210,
    present: ['free-drag/bounds', 'shared/landing'],
    absent: [...SORTABLE_ONLY, 'layout-animation'],
  },
  {
    name: 'sortable + y',
    imports: { 'src/sortable': ['sortable'], 'src/sortable/y': ['y'] },
    budget: 6733,
    present: ['linear-shift'],
    absent: [...OPTIONAL, 'sortable/xy', ...FREE_DRAG_ONLY],
  },
  {
    name: 'sortable + xy',
    imports: { 'src/sortable': ['sortable'], 'src/sortable/xy': ['xy'] },
    budget: 6617,
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
    budget: 7065,
    present: [...OPTIONAL, 'linear-shift'],
    absent: FREE_DRAG_ONLY,
  },
];

export type Measurement = Readonly<{
  composition: Composition;
  minified: number;
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
 * Bundles one composition from `base`, which holds `src` and the fixtures.
 * `packageRoot` resolves the package's own name for the prototype's examples.
 */
export async function bundleSize(
  source: string,
  base: string,
  packageRoot?: string,
): Promise<Readonly<{ minified: number; brotli: number; modules: string[] }>> {
  const directory = await mkdtemp(join(tmpdir(), 'drag-size-'));

  try {
    const input = join(directory, 'entry.js');

    await writeFile(input, source);

    const bundle = await rolldown({
      input,
      platform: 'neutral',
      resolve: { alias: { '@ydinjs/box-quad': BOX_QUAD } },
      transform: { define: { __DEV__: 'false' } },
      plugins: [
        {
          name: 'package-name',
          resolveId(id) {
            const match = /^@ydinjs\/drag\/(.+)\.js$/u.exec(id);

            return match && packageRoot
              ? `${packageRoot}/src/${match[1]}.ts`
              : null;
          },
        },
      ],
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

export async function measure(composition: Composition): Promise<Measurement> {
  const result = await bundleSize(entrySource(composition.imports, ROOT), ROOT);

  return { composition, ...result };
}

/** What a reading breaks: a ceiling, a control or a declared graph. */
export function violations(measurement: Measurement): readonly string[] {
  const { composition, brotli, modules } = measurement;
  const found: string[] = [];

  if (brotli > composition.budget) {
    found.push(
      `over its ${composition.budget} B ceiling by ${brotli - composition.budget} B`,
    );
  }

  if (composition.control !== undefined && brotli !== composition.control) {
    found.push(`control moved by ${brotli - composition.control} B`);
  }

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

const PROTOTYPE_ROWS: Readonly<Record<string, string>> = {
  'draggable alone': `import { draggable } from '@ydinjs/drag/draggable.js'; globalThis.a = [draggable];`,
  'example: resize handle': `import { resizeHandle } from '<root>/examples/resize-handle.ts'; globalThis.a = [resizeHandle];`,
  'example: drop zone': `import { dropZone } from '<root>/examples/drop-zone.ts'; globalThis.a = [dropZone];`,
  'example: canvas group': `import { canvasGroup } from '<root>/examples/canvas-group.ts'; globalThis.a = [canvasGroup];`,
  freeDrag: `import { freeDrag } from '@ydinjs/drag/free-drag.js'; globalThis.a = [freeDrag];`,
  'freeDrag + bounds + landing': `import { freeDrag } from '@ydinjs/drag/free-drag.js'; import { bounds } from '@ydinjs/drag/free-drag/bounds.js'; import { landing } from '@ydinjs/drag/free-drag/landing.js'; globalThis.a = [freeDrag, bounds, landing];`,
  'sortable + y': `import { sortable } from '@ydinjs/drag/sortable.js'; import { y } from '@ydinjs/drag/sortable/y.js'; globalThis.a = [sortable, y];`,
  'sortable + xy': `import { sortable } from '@ydinjs/drag/sortable.js'; import { xy } from '@ydinjs/drag/sortable/xy.js'; globalThis.a = [sortable, xy];`,
  complete: `import { sortable } from '@ydinjs/drag/sortable.js'; import { y } from '@ydinjs/drag/sortable/y.js'; import { landing } from '@ydinjs/drag/sortable/landing.js'; import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js'; globalThis.a = [sortable, y, landing, layoutAnimation];`,
};

async function measurePrototype(): Promise<Map<string, readonly number[]>> {
  const directory = await mkdtemp(join(tmpdir(), 'drag-prototype-'));
  const readings = new Map<string, number[]>();

  try {
    const archive = join(directory, 'tree.tar');

    await execFile(
      'git',
      [
        'archive',
        PROTOTYPE_REVISION,
        '--output',
        archive,
        'packages/drag/prototype/src',
        'packages/drag/prototype/examples',
      ],
      { cwd: join(ROOT, '../..') },
    );
    await execFile('tar', ['-xf', archive, '-C', directory]);

    const root = join(directory, 'packages/drag/prototype');

    for (const [name, template] of Object.entries(PROTOTYPE_ROWS)) {
      const source = template
        .replaceAll('<root>', root)
        .replaceAll(
          /@ydinjs\/drag\/([\w/-]+)\.js/gu,
          (_, path: string) => `${root}/src/${path}.ts`,
        );
      const { minified, brotli } = await bundleSize(source, root, root);

      readings.set(name, [minified, brotli]);
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }

  return readings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prototype = process.argv.includes('--prototype')
    ? await measurePrototype()
    : null;
  let failed = 0;

  for (const composition of COMPOSITIONS) {
    const measurement = await measure(composition);
    const found = violations(measurement);
    const before = prototype?.get(composition.name);
    const comparison = before
      ? `  prototype ${String(before[0]).padStart(6)} ${String(before[1]).padStart(6)}  ${measurement.brotli - before[1]! > 0 ? '+' : ''}${measurement.brotli - before[1]!} B`
      : '';

    failed += found.length;
    console.log(
      `${composition.name.padEnd(30)} ${String(measurement.minified).padStart(6)} min ${String(measurement.brotli).padStart(6)} br  ${measurement.modules.length} modules${comparison}`,
    );

    for (const line of found) {
      console.log(`  VIOLATION: ${line}`);
    }
  }

  process.exitCode = failed === 0 ? 0 : 1;
}
