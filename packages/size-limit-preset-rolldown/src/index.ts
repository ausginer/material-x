import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fileModules from '@size-limit/file';
import { rolldown } from 'rolldown';

/**
 * The subset of Size Limit's runtime shapes this preset touches. Size Limit
 * ships no types for them, so they are declared locally.
 */
type Check = {
  readonly name?: string;
  readonly import?: Readonly<Record<string, string>>;
  files: readonly string[];
  entryDir?: string;
};

type Config = Readonly<{
  cwd: string;
  checks: readonly Check[];
}>;

type Module = Readonly<{
  name: string;
  wait60?: string;
  before?(config: Config, check: Check): Promise<void> | void;
  step60?(config: Config, check: Check): Promise<void>;
  finally?(config: Config, check: Check): Promise<void> | void;
}>;

/**
 * Builds a virtual entry that re-exports only the requested named imports, so
 * a check can budget a tree-shaken slice of an entrypoint rather than all of
 * it. Mirrors the `import` option of `@size-limit/esbuild`.
 */
function createImportEntry(imports: Readonly<Record<string, string>>): string {
  return Object.entries(imports)
    .map(([path, names]) => `export ${names} from ${JSON.stringify(path)};`)
    .join('\n');
}

/**
 * Bundles already-built `.js` entrypoints with Rolldown so the measured size is
 * what a consumer's bundler ships: the entry's whole import graph, tree-shaken
 * and minified. Size Limit's own contract is to run against build output, so
 * this preset does not build from source — run the package build first.
 */
const rolldownBuilder: Module = {
  name: 'size-limit-preset-rolldown',
  wait60: 'Bundling with Rolldown',

  async before(_config, check) {
    check.entryDir = await mkdtemp(join(tmpdir(), 'size-limit-rolldown-'));
  },

  async step60(_config, check) {
    let input: readonly string[];

    if (check.import) {
      // Named-import checks bundle a generated re-export module instead of the
      // raw files, so Rolldown can drop everything the check does not name.
      const entry = join(check.entryDir!, 'entry.js');
      await writeFile(entry, createImportEntry(check.import), 'utf8');
      input = [entry];
    } else {
      input = check.files;
    }

    const outDir = join(check.entryDir!, 'dist');
    const bundle = await rolldown({
      input: [...input],
      // Built output already carries trait flattening and CSS handling, so no
      // plugins are needed — just resolve, tree-shake and bundle the graph.
      platform: 'neutral',
    });

    try {
      const { output } = await bundle.write({
        dir: outDir,
        format: 'es',
        minify: true,
      });

      check.files = output
        .filter(
          (chunk) => chunk.type === 'chunk' || chunk.fileName.endsWith('.css'),
        )
        .map((chunk) => join(outDir, chunk.fileName));
    } finally {
      await bundle.close();
    }
  },

  async finally(_config, check) {
    if (check.entryDir) {
      await rm(check.entryDir, { force: true, recursive: true });
    }
  },
};

const preset: readonly Module[] = [
  rolldownBuilder,
  ...(fileModules as Module[]),
];

export default preset;
