import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeModule,
  parseModule,
  type ModuleLoader,
} from '../src/analyze.ts';
import { appendSyntheticExports, lowerModule } from '../src/lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
} from '../src/normalize.ts';

/** Absolute directory URL of the descriptor fixtures. */
export const FIXTURES: URL = new URL('./fixtures/', import.meta.url);

/** Resolves a fixture file name to its absolute on-disk id. */
export function fixtureId(name: string): string {
  return fileURLToPath(new URL(name, FIXTURES));
}

/** Reads the source text of a fixture module. */
export function readFixture(name: string): Promise<string> {
  return readFile(fixtureId(name), 'utf8');
}

/**
 * A {@link ModuleLoader} backed by Node resolution: relative specifiers resolve
 * against the importer, bare specifiers through `import.meta.resolve`, mirroring
 * what the Vite plugin gets from the bundler.
 */
export const nodeLoader: ModuleLoader = {
  resolve: (specifier, importer) => {
    if (specifier.startsWith('.')) {
      return Promise.resolve(
        fileURLToPath(new URL(specifier, pathToFileURL(importer))),
      );
    }
    try {
      return Promise.resolve(
        fileURLToPath(import.meta.resolve(specifier, pathToFileURL(importer))),
      );
    } catch {
      return Promise.resolve(null);
    }
  },
  load: (id) => readFile(id, 'utf8'),
};

/** Scope of the fixture packages under `fixtures/packages/`. */
const FIXTURE_SCOPE = '@fixture/';

/**
 * {@link nodeLoader}, with `@fixture/<name>/<path>` resolved to
 * `fixtures/packages/<name>/<path>`: another package's built JavaScript, as the
 * bundler hands it to a consumer.
 */
export const fixtureLoader: ModuleLoader = {
  resolve: (specifier, importer) =>
    specifier.startsWith(FIXTURE_SCOPE)
      ? Promise.resolve(
          fixtureId(`packages/${specifier.slice(FIXTURE_SCOPE.length)}`),
        )
      : nodeLoader.resolve(specifier, importer),
  load: (id) => nodeLoader.load(id),
};

/**
 * Applies the origin-module transform to `code`: the synthetic exports of its
 * traits' private bindings.
 */
function augmentSource(id: string, code: string): string {
  const program = parseModule(id, code);
  const synthetics = collectModuleSyntheticExports(
    program,
    id,
    resolveFactoryLocals(program),
    code,
  );

  return appendSyntheticExports(code, synthetics)?.toString() ?? code;
}

/** A materialized flattening: both forms on disk, importable, then disposed. */
export interface Flattening {
  /** The flattened consumer's source. */
  readonly flat: string;
  /** Reason codes of the consumer's retained sites. */
  readonly bailouts: readonly string[];
  /** Absolute file URL for a generated module (e.g. `foo-flat.ts`). */
  url(file: string): string;
  /** Removes the generated directory. */
  dispose(): Promise<void>;
}

/**
 * Flattens `consumerName` and materializes the runtime-composed form
 * (`foo-composed.ts`), the flattened form (`foo-flat.ts`), each with the
 * consumer's extension, the `augment`ed trait
 * modules (with their build-only synthetic exports), and the `passthrough`
 * modules verbatim, into a fresh dir INSIDE the package tree — so the emitted
 * `@ydinjs/core` imports still resolve through the workspace node_modules.
 *
 * Synthetic export names are hashed from each module's ORIGINAL fixture id, and
 * the flattened consumer keeps the original relative specifiers, so the two
 * agree without any id rewriting.
 */
export async function flattenToDir(
  consumerName: string,
  options: Readonly<{
    augment: readonly string[];
    passthrough: readonly string[];
    /**
     * Fixture packages under `fixtures/packages/`, installed as
     * `node_modules/@fixture/<name>` with each module augmented, as that
     * package's own build emits it.
     */
    packages?: readonly string[];
  }>,
): Promise<Flattening> {
  const genDir = await mkdtemp(join(fileURLToPath(FIXTURES), 'gen-'));
  const consumerId = fixtureId(consumerName);
  const consumerCode = await readFixture(consumerName);
  const { compositions, bailouts } = await analyzeModule(
    consumerId,
    consumerCode,
    fixtureLoader,
  );
  const flat = lowerModule(consumerCode, compositions).toString();

  const augment = async (name: string): Promise<void> => {
    const code = await readFixture(name);
    await writeFile(join(genDir, name), augmentSource(fixtureId(name), code));
  };

  const install = async (name: string): Promise<void> => {
    const source = fixtureId(`packages/${name}`);
    const target = join(genDir, 'node_modules', '@fixture', name);
    await mkdir(target, { recursive: true });
    await cp(source, target, { recursive: true });
    for (const file of await readdir(source)) {
      if (file.endsWith('.mjs')) {
        const id = join(source, file);
        // oxlint-disable-next-line no-await-in-loop
        const code = await readFile(id, 'utf8');
        // oxlint-disable-next-line no-await-in-loop
        await writeFile(join(target, file), augmentSource(id, code));
      }
    }
  };

  await Promise.all([
    ...(options.packages ?? []).map(install),
    ...options.passthrough.map(
      async (name) =>
        await writeFile(join(genDir, name), await readFixture(name)),
    ),
    ...options.augment.map(augment),
    writeFile(join(genDir, `foo-flat${extname(consumerName)}`), flat),
    writeFile(
      join(genDir, `foo-composed${extname(consumerName)}`),
      consumerCode,
    ),
  ]);

  return {
    flat,
    bailouts: bailouts.map(({ reason }) => reason),
    url: (file) => pathToFileURL(join(genDir, file)).href,
    dispose: () => rm(genDir, { recursive: true, force: true }),
  };
}
