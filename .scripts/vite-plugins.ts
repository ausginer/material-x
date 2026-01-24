import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel, Worker } from 'node:worker_threads';
import { computed, signal } from '@preact/signals-core';
import type { Plugin } from 'vite';
import { compileCSS } from './css/css.ts';
import { compileHTML } from './html.ts';
import { cssCache, type JSONModule } from './utils.ts';

export type ConstructCSSTokensOptions = Readonly<{
  isProd: boolean;
}>;

export type ConstructCSSStylesOptions = Readonly<{
  isProd: boolean;
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
    base ? pathToFileURL(base) : pathToFileURL(import.meta.dirname),
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
        return await this.resolve(source + '?raw', importer, {
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
      async handler(source, importer) {
        return await this.resolve(source + '?raw', importer, {
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

function processComplexOxcSetting(
  setting: string | RegExp | ReadonlyArray<string | RegExp> | null | undefined,
): ReadonlyArray<string | RegExp> {
  const s = setting ?? [];
  return Array.isArray(s) ? s : [s];
}

export function constructCSSTokens(
  options?: ConstructCSSTokensOptions,
): Plugin {
  const trackedFiles = signal<Record<string, Set<string>>>({});
  const dependencies = computed(() =>
    Object.entries(trackedFiles.value).reduce<Record<string, Set<string>>>(
      (acc, [id, dependencies]) => {
        for (const d of dependencies) {
          acc[d] ??= new Set();
          acc[d].add(id);
        }

        return acc;
      },
      {},
    ),
  );

  const replaceList = Object.entries(propList).map(
    ([name, value]) => [new RegExp(`['"]${name}['"]`, 'gu'), value] as const,
  );

  return {
    name: 'vite-construct-css-tokens',
    enforce: 'pre',
    config(config) {
      if (config.oxc === false) {
        return config;
      }

      return {
        ...config,
        oxc: {
          ...config.oxc,
          exclude: [
            ...processComplexOxcSetting(config.oxc?.exclude),
            /\.css\.ts/u,
          ],
          jsxRefreshExclude: [
            ...processComplexOxcSetting(config.oxc?.jsxRefreshExclude),
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
        const { port1, port2 } = new MessageChannel();
        const deps = new Set<string>();

        port1.on('message', (module: string) => {
          deps.add(module);
          this.addWatchFile(module);
        });

        const result = await new Promise<string>((resolve, reject) => {
          const worker = new Worker(
            new URL('./css/css-worker.ts', import.meta.url),
            {
              execArgv: [
                '--import',
                fileURLToPath(
                  new URL('./css/deps-tracker.ts', import.meta.url),
                ),
                '--import',
                fileURLToPath(
                  new URL('./css/styles-import.ts', import.meta.url),
                ),
              ],
              workerData: {
                id: cleanId,
                monitorPort: port2,
              },
              transferList: [port2],
            },
          );

          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0)
              reject(new Error(`Worker stopped with exit code ${code}`));
          });
        });

        trackedFiles.value = {
          ...trackedFiles.peek(),
          [cleanId]: deps,
        };

        const { code, map } = await compileCSS(
          pathToFileURL(cleanId),
          result,
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
              return {
                code: replaceList.reduce(
                  (acc, [pattern, short]) => acc.replace(pattern, `'${short}'`),
                  code,
                ),
              };
            },
          },
        }
      : {}),
    handleHotUpdate: {
      handler({ file, server, timestamp }) {
        if (file in dependencies.value) {
          return dependencies.value[file]
            ?.values()
            .flatMap((file) => [
              ...(server.moduleGraph.getModulesByFile(file) ?? []),
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
        }

        return undefined;
      },
    },
  };
}
