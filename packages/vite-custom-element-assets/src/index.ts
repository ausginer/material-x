import { fileURLToPath, pathToFileURL } from 'node:url';
import { RolldownMagicString } from 'rolldown';
import type { Plugin } from 'vite';
import { compileCSS } from './css/css.ts';
import {
  acquireGeneration,
  discardGeneration,
  evaluate,
  releaseGeneration,
} from './css/generation.ts';
import { compileHTML } from './html.ts';
import { cssCache, type JSONModule } from './utils.ts';

export type ConstructCSSTokensOptions = Readonly<{
  isProd?: boolean;
}>;

export type ConstructCSSStylesOptions = Readonly<{
  isProd?: boolean;
}>;

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

function normalizePath(target: string, base?: string): string {
  if (!base && !target.includes('?') && !target.includes('#')) {
    return target;
  }

  const url = new URL(
    target,
    base ? pathToFileURL(base) : pathToFileURL(process.cwd()),
  );

  url.search = '';
  url.hash = '';

  return fileURLToPath(url);
}

export function constructCSSStyles(
  options?: ConstructCSSStylesOptions,
): Plugin {
  return {
    name: 'vite-construct-css-styles',
    enforce: 'pre',
    resolveId: {
      filter: {
        id: {
          include: /\.ctr\.css/u,
        },
      },
      order: 'pre',
      async handler(source, importer) {
        return await this.resolve(`${source}?raw`, importer, {
          skipSelf: true,
        });
      },
    },
    load: {
      filter: {
        id: {
          include: /\.ctr\.css/u,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);
        const source = await this.fs.readFile(cleanId, { encoding: 'utf8' });
        const { code, map } = await compileCSS(
          pathToFileURL(cleanId),
          source,
          options,
        );

        this.addWatchFile(cleanId);

        return {
          code,
          map,
        };
      },
    },
  };
}

export function constructHTMLTemplate(): Plugin {
  return {
    name: 'vite-construct-html-template',
    enforce: 'pre',
    resolveId: {
      filter: {
        id: {
          include: /\.tpl\.html/u,
        },
      },
      order: 'pre',
      async handler(source, importer, options) {
        if ('scan' in options && options.scan === true) {
          return source;
        }

        return await this.resolve(`${source}?raw`, importer, {
          skipSelf: true,
        });
      },
    },
    load: {
      filter: {
        id: {
          include: /\.tpl\.html/u,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);
        const source = await this.fs.readFile(cleanId, { encoding: 'utf8' });
        const { code, map } = await compileHTML(source, cleanId);

        this.addWatchFile(cleanId);

        return {
          code,
          map,
        };
      },
    },
  };
}

function normalizeOxcSetting(
  setting: string | RegExp | ReadonlyArray<string | RegExp> | null | undefined,
): ReadonlyArray<string | RegExp> {
  if (setting == null) {
    return [];
  }

  if (typeof setting === 'string' || setting instanceof RegExp) {
    return [setting];
  }

  return setting;
}

export function constructCSSTokens(
  options?: ConstructCSSTokensOptions,
): Plugin {
  // Every entry this instance evaluated, and every file the generation
  // resolved while doing so. The pair is deliberately not a per-entry map: in
  // a shared generation a module already loaded for an earlier entry resolves
  // none of its own imports again, so an entry-scoped set names a median of
  // three files and leaves the rest of the graph unwatched. Every entry
  // depends on the generation's whole set.
  const entries = new Set<string>();
  const tracked = new Set<string>();
  let acquired = false;

  const replaceList = Object.entries(propList).map(
    ([name, value]) => [new RegExp(`['"]${name}['"]`, 'gu'), value] as const,
  );

  return {
    name: 'vite-construct-css-tokens',
    enforce: 'pre',
    config(config) {
      if (config.oxc === false) {
        return null;
      }

      return {
        oxc: {
          ...config.oxc,
          exclude: [...normalizeOxcSetting(config.oxc?.exclude), /\.css\.ts/u],
          jsxRefreshExclude: [
            ...normalizeOxcSetting(config.oxc?.jsxRefreshExclude),
            /\.css\.ts/u,
          ],
        },
      };
    },
    resolveId: {
      filter: {
        id: {
          include: /\.css\.ts/u,
        },
      },
      order: 'pre',
      async handler(source, importer) {
        return await this.resolve(source, importer, {
          skipSelf: true,
        });
      },
    },
    load: {
      filter: {
        id: {
          include: /\.css\.ts/u,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);

        if (!acquired) {
          acquired = true;
          acquireGeneration();
        }

        const { code: source, deps } = await evaluate(cleanId);

        entries.add(cleanId);

        for (const dep of deps) {
          tracked.add(dep);
          this.addWatchFile(dep);
        }

        const { code, map } = await compileCSS(
          pathToFileURL(cleanId),
          source,
          options,
        );

        this.addWatchFile(cleanId);

        return {
          code,
          map,
          moduleType: 'js',
        };
      },
    },
    ...(options?.isProd
      ? {
          transform: {
            filter: {
              id: {
                include: /\.(?:ts|tsx)/,
                exclude: /\.css\.ts/,
              },
            },
            handler(code) {
              const s = new RolldownMagicString(code);

              for (const [pattern, short] of replaceList) {
                s.replaceRegex(pattern, `'${short}'`);
              }

              // Rolldown derives the sourcemap from the returned magic string
              // over its native channel, so no explicit map is needed.
              return s.hasChanged() ? { code: s } : null;
            },
          },
        }
      : {}),
    // Discards the generation so the next request evaluates the whole graph
    // against current files. Vite calls this for the client environment on
    // every watched change, and Rolldown calls it on a build rebuild, which is
    // the pair of paths a `.css.ts` graph is generated from.
    watchChange(id) {
      if (tracked.has(id) || id.endsWith('.css.ts')) {
        discardGeneration();
      }
    },
    // The generation belongs to the process, so the last consumer to leave
    // terminates it. Vite's plugin container calls this unconditionally when a
    // dev server closes, and Rolldown calls it from the `finally` that closes
    // a build — including a failing one.
    closeBundle() {
      if (acquired) {
        acquired = false;
        releaseGeneration();
      }
    },
    handleHotUpdate: {
      handler({ file, server, timestamp }) {
        // A shared input rather than an entry: inside one generation every
        // entry reaches the whole dependency set, so a change to any member
        // invalidates all of them and not merely the entry that happened to
        // resolve it first. An entry's own edit is left to Vite, which already
        // holds it in the module graph.
        if (!tracked.has(file) || entries.has(file)) {
          return undefined;
        }

        return entries
          .values()
          .flatMap((entry) => [
            ...(server.moduleGraph.getModulesByFile(entry) ?? []),
          ])
          .map((mod) => {
            server.moduleGraph.invalidateModule(
              mod,
              undefined,
              timestamp,
              true,
            );

            return mod;
          })
          .toArray();
      },
    },
  };
}
