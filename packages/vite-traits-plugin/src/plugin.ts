import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin as RolldownPlugin, RolldownMagicString } from 'rolldown';
import type { Plugin } from 'vite';
import {
  analyzeModule,
  invalidateModule,
  parseModule,
  type ModuleLoader,
} from './analyze.ts';
import { annotatePureTraitCalls, augmentOrigin, lowerModule } from './lower.ts';
import {
  collectModuleSyntheticExports,
  resolveFactoryLocals,
  resolveGenericFactoryLocals,
} from './normalize.ts';

/** Only real TypeScript/JS source modules are candidates. */
const CANDIDATE = /\.[cm]?[jt]sx?$/u;

/**
 * Builds the trait flattener plugin adapter.
 *
 * It runs `enforce: 'pre'` so it sees authored source before other transforms.
 * Each `impl` site is analyzed and lowered transactionally; a failed proof
 * warns and leaves the site unchanged.
 */
export function viteTraitsPlugin(): Plugin & RolldownPlugin {
  // A `RolldownMagicString` is only understood by rolldown's native build
  // pipeline. Vite's dev-server plugin container treats `code` as a plain
  // string and forwards the object verbatim to the builtin native transforms,
  // where Rust fails to convert it (`Object {}` -> `String`). So in `serve`
  // emit a string + sourcemap; keep the zero-copy native path for `build`.
  let serve = false;

  const emit = (magic: RolldownMagicString, id: string) =>
    serve
      ? {
          code: magic.toString(),
          map: magic
            .generateMap({ source: id, includeContent: true, hires: true })
            .toString(),
        }
      : { code: magic };

  const plugin: Plugin & RolldownPlugin = {
    name: 'trait-flattener',
    configResolved(config) {
      serve = config.command === 'serve';
    },
    watchChange(id) {
      invalidateModule(id);
    },
    async transform(code, id) {
      const cleanId = id.split('?', 1)[0]!;
      if (
        !CANDIDATE.test(cleanId) ||
        cleanId.includes('/node_modules/.vite/') ||
        (!code.includes('impl(') && !code.includes('trait('))
      ) {
        return null;
      }

      const loader: ModuleLoader = {
        resolve: async (specifier, importer) => {
          const resolved = await this.resolve(specifier, importer, {
            skipSelf: true,
          });
          if (resolved && !resolved.external) {
            const onDisk = resolved.id.split('?', 1)[0]!;
            if (onDisk.startsWith('/')) {
              return onDisk;
            }
          }
          // A workspace package (`@ydinjs/*`) is external to a consumer build,
          // so the bundler hands back a bare/external id with nothing to read.
          // Its built trait modules are still on disk, though, so resolve them
          // through Node — this is what lets cross-package compositions flatten.
          if (specifier.startsWith('@ydinjs/')) {
            try {
              return fileURLToPath(import.meta.resolve(specifier));
            } catch {
              return null;
            }
          }
          return null;
        },
        load: (moduleId) => readFile(moduleId, 'utf8'),
      };

      const program = parseModule(cleanId, code);
      const factoryLocals = resolveFactoryLocals(program);
      // Both factories' calls are marked pure.
      const traitLocals = factoryLocals.union(
        resolveGenericFactoryLocals(program),
      );

      // Consumer responsibility: flatten eligible compositions. A flattened
      // module still gets its `trait(...)` calls marked pure so the now-unused
      // intermediary scaffolding can be tree-shaken downstream.
      if (code.includes('impl(')) {
        const { compositions, bailouts, dependencies } = await analyzeModule(
          cleanId,
          code,
          loader,
        );
        for (const dependency of dependencies) {
          this.addWatchFile(dependency);
        }
        for (const bailout of bailouts) {
          this.warn({
            message: `trait-flattener: retained runtime composition${
              bailout.composition ? ` for ${bailout.composition}` : ''
            } (${bailout.reason}): ${bailout.message}`,
            id: cleanId,
          });
        }

        if (compositions.length > 0) {
          // Return the native MagicString as `code`; the bundler derives the
          // sourcemap from it natively.
          const magic = lowerModule(code, compositions);
          annotatePureTraitCalls(magic, program, traitLocals);
          return emit(magic, cleanId);
        }
      }

      // Origin responsibility: expose the private bindings that brands,
      // converters and method trait members read, so a flattened consumer in
      // another module can link them, and mark `trait(...)` calls pure.
      const synthetics = collectModuleSyntheticExports(
        program,
        cleanId,
        factoryLocals,
        code,
      );
      const augmented = augmentOrigin(code, synthetics, program, traitLocals);

      return augmented ? emit(augmented, cleanId) : null;
    },
  } satisfies Plugin;

  plugin.enforce = 'pre';

  return plugin;
}
