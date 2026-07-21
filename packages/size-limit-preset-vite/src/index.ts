import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import fileModules from '@size-limit/file';
import { build } from 'vite';

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

type BuildOutput = Readonly<{
  output: ReadonlyArray<Readonly<{ type: string; fileName: string }>>;
}>;

/**
 * Environment variable overriding the Vite config path from the CLI, where
 * Size Limit offers no way to pass options to a preset.
 */
export const CONFIG_ENV_VAR = 'SIZE_LIMIT_VITE_CONFIG';

const DEFAULT_CONFIG_FILE = 'vite.config.ts';

export type VitePresetOptions = Readonly<{
  /**
   * Path to the Vite config used to build the measured bundles, resolved
   * against the Size Limit config's directory. Defaults to the
   * {@link CONFIG_ENV_VAR} environment variable, then to `vite.config.ts` next
   * to the config — so a package is measured through its own pipeline without
   * any extra wiring.
   */
  configFile?: string;
}>;

function createViteBuilder(options: VitePresetOptions): Module {
  return {
    name: 'size-limit-preset-vite',
    wait60: 'Building the bundle with Vite',

    async before(_config, check) {
      check.entryDir = await mkdtemp(join(tmpdir(), 'size-limit-vite-'));
    },

    async step60(config, check) {
      const outDir = join(check.entryDir!, 'dist');
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

      const output = await build({
        // Resolve the package's own vite.config.ts so the measured bundle goes
        // through the same plugins (traits flattening, CSS assets) a consumer's
        // build would apply.
        configFile: resolve(
          config.cwd,
          options.configFile ??
            process.env[CONFIG_ENV_VAR] ??
            DEFAULT_CONFIG_FILE,
        ),
        root: config.cwd,
        logLevel: 'silent',
        build: {
          outDir,
          emptyOutDir: true,
          minify: true,
          write: true,
          lib: {
            entry: [...input],
            formats: ['es'],
          },
        },
      });

      // A library build with a single set of output options yields one bundle.
      const [bundle] = output as readonly BuildOutput[];

      check.files = bundle!.output
        .filter(
          (chunk) => chunk.type === 'chunk' || chunk.fileName.endsWith('.css'),
        )
        .map((chunk) => join(outDir, chunk.fileName));
    },

    async finally(_config, check) {
      if (check.entryDir) {
        await rm(check.entryDir, { force: true, recursive: true });
      }
    },
  };
}

/**
 * Builds the preset against a custom Vite config path.
 *
 * Size Limit validates check keys against a fixed list and loads presets only
 * from `package.json` dependencies, so a custom path cannot be passed through
 * `.size-limit.json`. Use this factory with Size Limit's programmatic API:
 *
 * ```ts
 * import sizeLimit from 'size-limit';
 * import { createVitePreset } from 'size-limit-preset-vite';
 *
 * const [{ size }] = await sizeLimit(
 *   [createVitePreset({ configFile: 'vite.size.ts' })],
 *   ['src/draggable.ts'],
 * );
 * ```
 *
 * From the CLI, set {@link CONFIG_ENV_VAR} instead.
 */
export function createVitePreset(
  options: VitePresetOptions = {},
): readonly Module[] {
  return [createViteBuilder(options), ...(fileModules as Module[])];
}

/** Auto-searching preset: builds through `<config dir>/vite.config.ts`. */
const preset: readonly Module[] = createVitePreset();

export default preset;
