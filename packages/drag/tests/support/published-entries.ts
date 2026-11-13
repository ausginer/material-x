/**
 * Resolves this package as a consumer of its publication does, in Vite and in
 * Rolldown alike.
 *
 * The file an import reaches decides, whatever form the specifier takes:
 * relative, absolute, from the Vite root, `/@fs/`, a `file:` URL, or any of
 * these with a query or a hash. Every specifier is resolved first. When the file
 * is a published entry's source, `src/<entry>.ts`, the import resolves as
 * `<package>/<entry>.js` does: through the exports map, to the emitted file, with
 * the specifier's query or hash kept. Any other file under `src/` is an error at
 * resolution that names it, because the package does not publish it. An import
 * that reaches no file under `src/` resolves as it would without this plugin. A
 * type-only import is erased before resolution and never reaches it.
 */
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

type Resolution = Readonly<{ id: string }>;

/** The part of a Vite or Rolldown plugin context that resolution uses. */
type ResolveContext = Readonly<{
  resolve(
    source: string,
    importer: string | undefined,
    options: Readonly<{ skipSelf: boolean }>,
  ): Promise<Resolution | null>;
  error(message: string): never;
}>;

/** A plugin that Vite's and Rolldown's `plugins` options both accept. */
export type PublishedEntriesPlugin = Readonly<{
  name: string;
  enforce: 'pre';
  resolveId(
    this: ResolveContext,
    source: string,
    importer: string | undefined,
  ): Promise<Resolution | null>;
}>;

type PackageManifest = Readonly<{
  name: string;
  exports: Readonly<Record<string, unknown>>;
}>;

/** `root` is the package's directory, as an absolute path. */
export function publishedEntries(root: string): PublishedEntriesPlugin {
  const source = join(root, 'src/');
  // Inside the package, so the package's own name resolves from it as it does
  // from a consumer's file.
  const importer = join(root, 'package.json');
  let manifest: Promise<PackageManifest> | null = null;

  return {
    name: 'published-entries',
    enforce: 'pre',
    async resolveId(specifier, from) {
      if (specifier.startsWith('\0')) {
        return null;
      }

      const resolved = await this.resolve(specifier, from, { skipSelf: true });

      if (!resolved?.id.startsWith(source)) {
        return null;
      }

      const [file = '', suffix = ''] = /^([^?#]*)(.*)$/su
        .exec(resolved.id)!
        .slice(1);

      manifest ??= readFile(importer, 'utf8').then(
        (text) => JSON.parse(text) as PackageManifest,
      );

      const { name, exports } = await manifest;
      const entry = relative(source, file).replace(/\.ts$/u, '.js');

      if (!(`./${entry}` in exports)) {
        this.error(
          `${relative(root, file)} is not a published entry of ${name}`,
        );
      }

      const emitted = await this.resolve(`${name}/${entry}`, importer, {
        skipSelf: true,
      });

      if (!emitted) {
        this.error(`could not resolve ${name}/${entry}`);
      }

      return { ...emitted, id: `${emitted.id}${suffix}` };
    },
  };
}
