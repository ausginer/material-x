/**
 * Minified and Brotli size of each composition, with esbuild as the probes before
 * it used, and module attribution for the complete one. An unresolved import fails
 * the build. Writes `.plan/probes/prototype/size.txt`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { build, type Plugin } from 'esbuild';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = `${here}/..`;
const output = `${root}/../.plan/probes/prototype/size.txt`;

const consumerAlias: Plugin = {
  name: 'consumer-alias',
  setup(context) {
    context.onResolve({ filter: /^@ydinjs\/drag\// }, ({ path }) => ({
      path: `${root}/src/${path.slice('@ydinjs/drag/'.length).replace(/\.js$/u, '.ts')}`,
    }));
    context.onResolve({ filter: /^@ydinjs\/box-quad$/ }, () => ({
      path: `${root}/../../box-quad/src/index.ts`,
    }));
    context.onResolve({ filter: /^@ydinjs\/drag\/examples\// }, ({ path }) => ({
      path,
    }));
  },
};

const compositions: Record<string, string> = {
  'draggable alone': `import { draggable } from '@ydinjs/drag/draggable.js'; globalThis.a = [draggable];`,
  'example: resize handle': `import { resizeHandle } from '${root}/examples/resize-handle.ts'; globalThis.a = [resizeHandle];`,
  'example: drop zone': `import { dropZone } from '${root}/examples/drop-zone.ts'; globalThis.a = [dropZone];`,
  'example: canvas group': `import { canvasGroup } from '${root}/examples/canvas-group.ts'; globalThis.a = [canvasGroup];`,
  freeDrag: `import { freeDrag } from '@ydinjs/drag/free-drag.js'; globalThis.a = [freeDrag];`,
  'freeDrag + bounds + landing': `import { freeDrag } from '@ydinjs/drag/free-drag.js'; import { bounds } from '@ydinjs/drag/free-drag/bounds.js'; import { landing } from '@ydinjs/drag/free-drag/landing.js'; globalThis.a = [freeDrag, bounds, landing];`,
  'sortable + y': `import { sortable } from '@ydinjs/drag/sortable.js'; import { y } from '@ydinjs/drag/sortable/y.js'; globalThis.a = [sortable, y];`,
  'sortable + xy': `import { sortable } from '@ydinjs/drag/sortable.js'; import { xy } from '@ydinjs/drag/sortable/xy.js'; globalThis.a = [sortable, xy];`,
  complete: `import { sortable } from '@ydinjs/drag/sortable.js'; import { y } from '@ydinjs/drag/sortable/y.js'; import { landing } from '@ydinjs/drag/sortable/landing.js'; import { layoutAnimation } from '@ydinjs/drag/sortable/layout-animation.js'; globalThis.a = [sortable, y, landing, layoutAnimation];`,
};

const lines: string[] = [];

const measure = async (contents: string) => {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    target: 'es2022',
    metafile: true,
    define: { __DEV__: 'false' },
    plugins: [consumerAlias],
    logLevel: 'silent',
  });
  const code = result.outputFiles[0]!.contents;
  const brotli = brotliCompressSync(code, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

  return { minified: code.length, brotli, meta: result.metafile };
};

let complete: Awaited<ReturnType<typeof measure>> | null = null;

lines.push('composition                      minified   brotli', '');

for (const [name, source] of Object.entries(compositions)) {
  const measured = await measure(source);

  if (name === 'complete') {
    complete = measured;
  }

  const modules = Object.keys(measured.meta.inputs).filter(
    (path) => path.includes('sortable') || path.includes('landing'),
  );

  if (name === 'draggable alone' && modules.length > 0) {
    throw new Error(`draggable alone reached ${modules.join()}`);
  }

  lines.push(
    `${name.padEnd(32)} ${String(measured.minified).padStart(8)} ${String(measured.brotli).padStart(8)}`,
  );
}

lines.push('', 'complete: minified bytes attributed per module', '');

const outputs = Object.values(complete!.meta.outputs)[0]!;
const attributed = Object.entries(outputs.inputs)
  .map(([path, { bytesInOutput }]) => [path, bytesInOutput] as const)
  .filter(([, bytes]) => bytes > 0)
  .toSorted((a, b) => b[1] - a[1]);

for (const [path, bytes] of attributed) {
  lines.push(
    `${String(bytes).padStart(7)}  ${relative(root, path.startsWith('/') ? path : `${process.cwd()}/${path}`)}`,
  );
}

/** Statements and declarations, comments and blanks removed, types kept. */
const countCode = async (file: string): Promise<number> => {
  const source = await readFile(`${root}/${file}`, 'utf8');
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
  );

  return ts
    .createPrinter({ removeComments: true })
    .printFile(parsed)
    .split('\n')
    .filter((line) => line.trim()).length;
};

lines.push('', 'lines without comments', '');

for (const [name, files] of Object.entries({
  'lifecycle: kernel and authoring API': ['src/draggable.ts'],
  'sortable glue': ['src/sortable.ts'],
  'free-drag glue': ['src/free-drag.ts'],
  fault: ['src/fault.ts'],
  presentation: ['src/draggable/presentation.ts'],
  'example: resize handle': ['examples/resize-handle.ts'],
  'example: drop zone': ['examples/drop-zone.ts'],
  'example: canvas group': ['examples/canvas-group.ts'],
})) {
  let total = 0;

  for (const file of files) {
    total += await countCode(file);
  }

  lines.push(`${String(total).padStart(6)}  ${name}`);
}

const text = `${lines.join('\n')}\n`;

await writeFile(output, text);
console.log(text);
